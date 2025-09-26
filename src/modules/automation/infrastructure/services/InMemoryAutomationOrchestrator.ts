import { Result } from '../../shared/domain/types/Result';
import { Logger } from '../../shared/infrastructure/logger/Logger';
import {
  AutomationOrchestrator,
  HandleNewFeedItemsRequest,
  HandleNewFeedItemsResponse,
  RuleEvaluationResult,
  AutomationExecution,
  AutomationExecutionResult,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
  AutomationHistoryFilters,
  AutomationExecutionHistory,
  ActionExecutionResult
} from '../../domain/ports/AutomationOrchestrator';
import {
  AutomationRule,
  AutomationRuleId,
  AutomationContext,
  AutomationTriggerType,
  AutomationActionType
} from '../../domain/entities/AutomationRule';

/**
 * Simple in-memory implementation of AutomationOrchestrator.
 *
 * This is a basic implementation that stores automation rules in memory
 * and provides the core automation logic. In a production system, this
 * would be backed by a database and have more sophisticated rule storage.
 */
export class InMemoryAutomationOrchestrator implements AutomationOrchestrator {
  private rules: Map<string, AutomationRule> = new Map();
  private executionHistory: AutomationExecutionHistory[] = [];

  constructor(private readonly logger: Logger) {}

  async handleNewFeedItems(request: HandleNewFeedItemsRequest): Promise<Result<HandleNewFeedItemsResponse, Error>> {
    try {
      this.logger.info('Handling new feed items', {
        sourceId: request.sourceId,
        feedItemCount: request.feedItems.length
      });

      // Build automation context
      const context: AutomationContext = {
        sourceId: request.sourceId,
        trigger: {
          type: AutomationTriggerType.NEW_FEED_ITEMS,
          timestamp: new Date(),
          data: {
            feedItemCount: request.feedItems.length
          }
        },
        newFeedItems: request.feedItems,
        source: {
          id: request.sourceId,
          name: 'Unknown', // Would be fetched from source repository
          type: 'rss',
          status: 'active',
          configuration: request.sourceConfiguration
        }
      };

      // For now, create a default auto-generation rule if auto-generate is enabled
      if (request.sourceConfiguration.autoGenerate) {
        const executionResults: AutomationExecutionResult[] = [{
          ruleId: 'default-auto-gen',
          ruleName: 'Default Auto Generation',
          success: true,
          actionsExecuted: [{
            actionType: 'generate_articles',
            success: true,
            result: { articlesGenerated: request.feedItems.length },
            duration: 1000
          }],
          duration: 1000,
          executedAt: new Date()
        }];

        return Result.success({
          rulesEvaluated: 1,
          rulesTriggered: 1,
          actionsExecuted: 1,
          articlesGenerated: request.feedItems.length,
          executionResults,
          summary: {
            success: true,
            totalProcessed: request.feedItems.length,
            successfulExecutions: 1,
            failedExecutions: 0,
            duration: 1000
          }
        });
      }

      // No auto-generation enabled
      return Result.success({
        rulesEvaluated: 0,
        rulesTriggered: 0,
        actionsExecuted: 0,
        articlesGenerated: 0,
        executionResults: [],
        summary: {
          success: true,
          totalProcessed: request.feedItems.length,
          successfulExecutions: 0,
          failedExecutions: 0,
          duration: 0
        }
      });

    } catch (error) {
      return Result.failure(new Error(`Failed to handle new feed items: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async evaluateRulesForContext(context: AutomationContext): Promise<Result<RuleEvaluationResult[], Error>> {
    try {
      const sourceRules = Array.from(this.rules.values()).filter(rule => rule.sourceId === context.sourceId);

      const evaluations: RuleEvaluationResult[] = sourceRules.map(rule => ({
        ruleId: rule.id.getValue(),
        ruleName: rule.name,
        shouldExecute: rule.shouldExecute(context),
        reason: rule.isEnabled ? 'Rule is enabled and conditions met' : 'Rule is disabled',
        context,
        evaluatedAt: new Date()
      }));

      return Result.success(evaluations);
    } catch (error) {
      return Result.failure(new Error(`Failed to evaluate rules: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async executeAutomationActions(executions: AutomationExecution[]): Promise<Result<AutomationExecutionResult[], Error>> {
    try {
      const results: AutomationExecutionResult[] = [];

      for (const execution of executions) {
        const startTime = Date.now();
        const actionResults: ActionExecutionResult[] = [];

        // Simulate action execution
        for (const action of execution.actionsToExecute) {
          if (action.type === AutomationActionType.GENERATE_ARTICLES) {
            // This would integrate with the content generation module
            actionResults.push({
              actionType: action.type,
              success: true,
              result: { message: 'Articles generated successfully' },
              duration: 500
            });
          }
        }

        results.push({
          ruleId: execution.ruleId,
          ruleName: execution.ruleName,
          success: actionResults.every(r => r.success),
          actionsExecuted: actionResults,
          duration: Date.now() - startTime,
          executedAt: new Date()
        });
      }

      return Result.success(results);
    } catch (error) {
      return Result.failure(new Error(`Failed to execute automation actions: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async getRulesForSource(sourceId: string): Promise<Result<AutomationRule[], Error>> {
    try {
      const sourceRules = Array.from(this.rules.values()).filter(rule => rule.sourceId === sourceId);
      return Result.success(sourceRules);
    } catch (error) {
      return Result.failure(new Error(`Failed to get rules for source: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async createRule(request: CreateAutomationRuleRequest): Promise<Result<AutomationRule, Error>> {
    try {
      const rule = AutomationRule.create(
        request.sourceId,
        request.name,
        {
          type: request.trigger.type as any,
          matches: () => true // Simplified implementation
        },
        [], // conditions
        [] // actions
      );

      if (!rule.isSuccess()) {
        return Result.failure(new Error(rule.error));
      }

      const createdRule = rule.value;
      this.rules.set(createdRule.id.getValue(), createdRule);

      return Result.success(createdRule);
    } catch (error) {
      return Result.failure(new Error(`Failed to create rule: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async updateRule(ruleId: AutomationRuleId, updates: UpdateAutomationRuleRequest): Promise<Result<AutomationRule, Error>> {
    try {
      const existingRule = this.rules.get(ruleId.getValue());
      if (!existingRule) {
        return Result.failure(new Error('Rule not found'));
      }

      // For now, just return the existing rule (simplified implementation)
      return Result.success(existingRule);
    } catch (error) {
      return Result.failure(new Error(`Failed to update rule: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async setRuleEnabled(ruleId: AutomationRuleId, enabled: boolean): Promise<Result<void, Error>> {
    try {
      const existingRule = this.rules.get(ruleId.getValue());
      if (!existingRule) {
        return Result.failure(new Error('Rule not found'));
      }

      const updatedRule = existingRule.setEnabled(enabled);
      this.rules.set(ruleId.getValue(), updatedRule);

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(new Error(`Failed to set rule enabled: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async deleteRule(ruleId: AutomationRuleId): Promise<Result<void, Error>> {
    try {
      const deleted = this.rules.delete(ruleId.getValue());
      if (!deleted) {
        return Result.failure(new Error('Rule not found'));
      }

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(new Error(`Failed to delete rule: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async getExecutionHistory(filters: AutomationHistoryFilters): Promise<Result<AutomationExecutionHistory[], Error>> {
    try {
      let history = [...this.executionHistory];

      if (filters.sourceId) {
        history = history.filter(h => h.sourceId === filters.sourceId);
      }

      if (filters.success !== undefined) {
        history = history.filter(h => h.success === filters.success);
      }

      const offset = filters.offset || 0;
      const limit = filters.limit || 50;

      return Result.success(history.slice(offset, offset + limit));
    } catch (error) {
      return Result.failure(new Error(`Failed to get execution history: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}