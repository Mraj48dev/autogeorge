import { Result } from '../shared/domain/types/Result';
import { Logger } from '../shared/infrastructure/logger/Logger';
import { AutomationOrchestrator } from '../domain/ports/AutomationOrchestrator';
import { HandleContentAutomation } from '../application/use-cases/HandleContentAutomation';

/**
 * Admin facade for the Automation module.
 *
 * Provides administrative functions for managing automation rules,
 * monitoring execution history, and coordinating automation workflows.
 */
export class AutomationAdminFacade {
  constructor(
    private readonly automationOrchestrator: AutomationOrchestrator,
    private readonly handleContentAutomation: HandleContentAutomation,
    private readonly logger: Logger
  ) {}

  // ==================== AUTOMATION RULES MANAGEMENT ====================

  /**
   * Creates a new automation rule for a source
   */
  async createAutomationRule(request: CreateAutomationRuleCommand): Promise<Result<AutomationRuleDto, Error>> {
    try {
      this.logger.info('Creating automation rule', { sourceId: request.sourceId, name: request.name });

      const createRequest = {
        sourceId: request.sourceId,
        name: request.name,
        description: request.description,
        trigger: request.trigger,
        conditions: request.conditions || [],
        actions: request.actions,
        isEnabled: request.isEnabled ?? true
      };

      const result = await this.automationOrchestrator.createRule(createRequest);

      if (!result.isSuccess()) {
        return Result.failure(result.error);
      }

      const rule = result.value;
      const dto: AutomationRuleDto = {
        id: rule.id.getValue(),
        sourceId: rule.sourceId,
        name: rule.name,
        isEnabled: rule.isEnabled,
        trigger: rule.trigger,
        conditions: rule.conditions,
        actions: rule.actions,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
        lastExecutedAt: rule.lastExecutedAt?.toISOString(),
        executionCount: rule.executionCount
      };

      return Result.success(dto);

    } catch (error) {
      this.logger.error('Failed to create automation rule', { error: error instanceof Error ? error.message : error });
      return Result.failure(new Error(`Failed to create automation rule: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Gets automation rules for a specific source
   */
  async getAutomationRulesForSource(sourceId: string): Promise<Result<AutomationRuleDto[], Error>> {
    try {
      this.logger.info('Getting automation rules for source', { sourceId });

      const result = await this.automationOrchestrator.getRulesForSource(sourceId);

      if (!result.isSuccess()) {
        return Result.failure(result.error);
      }

      const rules = result.value;
      const dtos: AutomationRuleDto[] = rules.map(rule => ({
        id: rule.id.getValue(),
        sourceId: rule.sourceId,
        name: rule.name,
        isEnabled: rule.isEnabled,
        trigger: rule.trigger,
        conditions: rule.conditions,
        actions: rule.actions,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
        lastExecutedAt: rule.lastExecutedAt?.toISOString(),
        executionCount: rule.executionCount
      }));

      return Result.success(dtos);

    } catch (error) {
      this.logger.error('Failed to get automation rules', { sourceId, error: error instanceof Error ? error.message : error });
      return Result.failure(new Error(`Failed to get automation rules: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Enables or disables an automation rule
   */
  async setAutomationRuleEnabled(ruleId: string, enabled: boolean): Promise<Result<void, Error>> {
    try {
      this.logger.info('Setting automation rule enabled status', { ruleId, enabled });

      const result = await this.automationOrchestrator.setRuleEnabled(
        { getValue: () => ruleId } as any,
        enabled
      );

      if (!result.isSuccess()) {
        return Result.failure(result.error);
      }

      return Result.success(undefined);

    } catch (error) {
      this.logger.error('Failed to set automation rule enabled status', { ruleId, enabled, error: error instanceof Error ? error.message : error });
      return Result.failure(new Error(`Failed to set automation rule status: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Deletes an automation rule
   */
  async deleteAutomationRule(ruleId: string): Promise<Result<void, Error>> {
    try {
      this.logger.info('Deleting automation rule', { ruleId });

      const result = await this.automationOrchestrator.deleteRule(
        { getValue: () => ruleId } as any
      );

      if (!result.isSuccess()) {
        return Result.failure(result.error);
      }

      return Result.success(undefined);

    } catch (error) {
      this.logger.error('Failed to delete automation rule', { ruleId, error: error instanceof Error ? error.message : error });
      return Result.failure(new Error(`Failed to delete automation rule: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  // ==================== AUTOMATION EXECUTION ====================

  /**
   * Manually triggers automation for new feed items
   * This is called by the sources module when new items are detected
   */
  async triggerAutomationForFeedItems(request: TriggerAutomationCommand): Promise<Result<AutomationExecutionSummary, Error>> {
    try {
      this.logger.info('Triggering automation for feed items', {
        sourceId: request.sourceId,
        feedItemCount: request.feedItems.length
      });

      const automationRequest = {
        sourceId: request.sourceId,
        feedItems: request.feedItems,
        sourceConfiguration: request.sourceConfiguration,
        triggerType: 'new_feed_items' as const
      };

      const result = await this.handleContentAutomation.execute(automationRequest);

      if (!result.isSuccess()) {
        return Result.failure(result.error);
      }

      const response = result.value;
      const summary: AutomationExecutionSummary = {
        sourceId: response.sourceId,
        rulesEvaluated: response.rulesEvaluated,
        rulesTriggered: response.rulesTriggered,
        actionsExecuted: response.actionsExecuted,
        articlesGenerated: response.articlesGenerated,
        success: response.summary.success,
        duration: response.summary.duration,
        executedAt: new Date().toISOString()
      };

      return Result.success(summary);

    } catch (error) {
      this.logger.error('Failed to trigger automation for feed items', {
        sourceId: request.sourceId,
        error: error instanceof Error ? error.message : error
      });
      return Result.failure(new Error(`Failed to trigger automation: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Gets automation execution history
   */
  async getAutomationHistory(filters: AutomationHistoryQuery): Promise<Result<AutomationHistoryDto[], Error>> {
    try {
      this.logger.info('Getting automation history', { filters });

      const historyFilters = {
        sourceId: filters.sourceId,
        ruleId: filters.ruleId,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        success: filters.success,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      };

      const result = await this.automationOrchestrator.getExecutionHistory(historyFilters);

      if (!result.isSuccess()) {
        return Result.failure(result.error);
      }

      const history = result.value;
      const dtos: AutomationHistoryDto[] = history.map(entry => ({
        id: entry.id,
        ruleId: entry.ruleId,
        ruleName: entry.ruleName,
        sourceId: entry.sourceId,
        sourceName: entry.sourceName,
        executedAt: entry.executedAt.toISOString(),
        duration: entry.duration,
        success: entry.success,
        actionsExecuted: entry.actionsExecuted,
        articlesGenerated: entry.articlesGenerated,
        error: entry.error
      }));

      return Result.success(dtos);

    } catch (error) {
      this.logger.error('Failed to get automation history', { filters, error: error instanceof Error ? error.message : error });
      return Result.failure(new Error(`Failed to get automation history: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}

// ==================== DTOs AND COMMANDS ====================

export interface CreateAutomationRuleCommand {
  sourceId: string;
  name: string;
  description?: string;
  trigger: {
    type: string;
    parameters: Record<string, any>;
  };
  conditions?: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  actions: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  isEnabled?: boolean;
}

export interface AutomationRuleDto {
  id: string;
  sourceId: string;
  name: string;
  isEnabled: boolean;
  trigger: any;
  conditions: any[];
  actions: any[];
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  executionCount: number;
}

export interface TriggerAutomationCommand {
  sourceId: string;
  feedItems: Array<{
    id: string;
    guid: string;
    title: string;
    content: string;
    url?: string;
    publishedAt: Date;
    fetchedAt: Date;
  }>;
  sourceConfiguration: Record<string, any>;
}

export interface AutomationExecutionSummary {
  sourceId: string;
  rulesEvaluated: number;
  rulesTriggered: number;
  actionsExecuted: number;
  articlesGenerated: number;
  success: boolean;
  duration: number;
  executedAt: string;
}

export interface AutomationHistoryQuery {
  sourceId?: string;
  ruleId?: string;
  dateFrom?: string;
  dateTo?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AutomationHistoryDto {
  id: string;
  ruleId: string;
  ruleName: string;
  sourceId: string;
  sourceName: string;
  executedAt: string;
  duration: number;
  success: boolean;
  actionsExecuted: number;
  articlesGenerated: number;
  error?: string;
}