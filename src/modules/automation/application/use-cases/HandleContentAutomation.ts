import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { Logger } from '../../shared/infrastructure/logger/Logger';
import {
  AutomationOrchestrator,
  HandleNewFeedItemsRequest,
  HandleNewFeedItemsResponse,
  AutomationContext,
  RuleEvaluationResult,
  AutomationExecution,
  AutomationExecutionResult
} from '../ports/AutomationOrchestrator';
import { AutomationRule, AutomationTriggerType } from '../entities/AutomationRule';

/**
 * Use case for handling content automation workflows.
 *
 * This orchestrates the entire automation process:
 * 1. Receives events from sources module (new feed items)
 * 2. Evaluates automation rules for the source
 * 3. Triggers appropriate actions (article generation, notifications, etc.)
 * 4. Coordinates with content module for article generation
 * 5. Tracks execution results and history
 */
export class HandleContentAutomation implements UseCase<HandleContentAutomationRequest, HandleContentAutomationResponse> {
  constructor(
    private readonly automationOrchestrator: AutomationOrchestrator,
    private readonly logger: Logger
  ) {}

  async execute(request: HandleContentAutomationRequest): Promise<Result<HandleContentAutomationResponse>> {
    try {
      const startTime = Date.now();

      this.logger.info('Starting content automation workflow', {
        sourceId: request.sourceId,
        feedItemCount: request.feedItems.length,
        triggerType: request.triggerType
      });

      // Build automation context
      const context: AutomationContext = {
        sourceId: request.sourceId,
        trigger: {
          type: request.triggerType,
          timestamp: new Date(),
          data: {
            feedItemCount: request.feedItems.length,
            source: request.sourceConfiguration
          }
        },
        newFeedItems: request.feedItems.map(item => ({
          id: item.id,
          guid: item.guid,
          title: item.title,
          content: item.content,
          publishedAt: item.publishedAt
        })),
        source: {
          id: request.sourceId,
          name: request.sourceConfiguration.name || 'Unknown',
          type: request.sourceConfiguration.type || 'rss',
          status: request.sourceConfiguration.status || 'active',
          configuration: request.sourceConfiguration
        }
      };

      // Step 1: Evaluate automation rules
      const evaluationResult = await this.automationOrchestrator.evaluateRulesForContext(context);
      if (!evaluationResult.isSuccess()) {
        return Result.failure(new Error(`Failed to evaluate automation rules: ${evaluationResult.error}`));
      }

      const ruleEvaluations = evaluationResult.value;
      const triggeredRules = ruleEvaluations.filter(evaluation => evaluation.shouldExecute);

      this.logger.info('Automation rules evaluated', {
        sourceId: request.sourceId,
        totalRules: ruleEvaluations.length,
        triggeredRules: triggeredRules.length,
        rulesTriggered: triggeredRules.map(r => r.ruleName)
      });

      // Step 2: Execute automation actions for triggered rules
      if (triggeredRules.length === 0) {
        return Result.success({
          sourceId: request.sourceId,
          rulesEvaluated: ruleEvaluations.length,
          rulesTriggered: 0,
          actionsExecuted: 0,
          articlesGenerated: 0,
          executionResults: [],
          summary: {
            success: true,
            totalProcessed: request.feedItems.length,
            successfulExecutions: 0,
            failedExecutions: 0,
            duration: Date.now() - startTime
          }
        });
      }

      // Convert rule evaluations to executions
      const executions: AutomationExecution[] = triggeredRules.map(evaluation => ({
        ruleId: evaluation.ruleId,
        ruleName: evaluation.ruleName,
        context: evaluation.context,
        actionsToExecute: [], // This would be populated from the actual rule's actions
        evaluatedAt: evaluation.evaluatedAt
      }));

      // Step 3: Execute the automation actions
      const executionResult = await this.automationOrchestrator.executeAutomationActions(executions);
      if (!executionResult.isSuccess()) {
        return Result.failure(new Error(`Failed to execute automation actions: ${executionResult.error}`));
      }

      const executionResults = executionResult.value;
      const successfulExecutions = executionResults.filter(r => r.success).length;
      const failedExecutions = executionResults.filter(r => !r.success).length;

      // Calculate articles generated
      const articlesGenerated = executionResults.reduce((total, result) => {
        const articleActions = result.actionsExecuted.filter(
          action => action.actionType === 'generate_articles' && action.success
        );
        return total + articleActions.length;
      }, 0);

      this.logger.info('Content automation workflow completed', {
        sourceId: request.sourceId,
        rulesEvaluated: ruleEvaluations.length,
        rulesTriggered: triggeredRules.length,
        successfulExecutions,
        failedExecutions,
        articlesGenerated,
        duration: Date.now() - startTime
      });

      const response: HandleContentAutomationResponse = {
        sourceId: request.sourceId,
        rulesEvaluated: ruleEvaluations.length,
        rulesTriggered: triggeredRules.length,
        actionsExecuted: executionResults.reduce((total, r) => total + r.actionsExecuted.length, 0),
        articlesGenerated,
        executionResults,
        summary: {
          success: failedExecutions === 0,
          totalProcessed: request.feedItems.length,
          successfulExecutions,
          failedExecutions,
          duration: Date.now() - startTime
        }
      };

      return Result.success(response);

    } catch (error) {
      this.logger.error('Content automation workflow failed', {
        sourceId: request.sourceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return Result.failure(
        new Error(`Content automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }
}

export interface HandleContentAutomationRequest {
  sourceId: string;
  feedItems: FeedItemForAutomation[];
  sourceConfiguration: Record<string, any>;
  triggerType: AutomationTriggerType;
}

export interface FeedItemForAutomation {
  id: string;
  guid: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
  fetchedAt: Date;
}

export interface HandleContentAutomationResponse {
  sourceId: string;
  rulesEvaluated: number;
  rulesTriggered: number;
  actionsExecuted: number;
  articlesGenerated: number;
  executionResults: AutomationExecutionResult[];
  summary: {
    success: boolean;
    totalProcessed: number;
    successfulExecutions: number;
    failedExecutions: number;
    duration: number;
  };
}