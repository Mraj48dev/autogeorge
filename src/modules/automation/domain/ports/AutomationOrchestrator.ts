import { Result } from '../../shared/domain/types/Result';
import { AutomationRule, AutomationContext, AutomationRuleId } from '../entities/AutomationRule';

/**
 * Port for orchestrating automation workflows.
 *
 * This service is responsible for:
 * - Evaluating automation rules when events occur
 * - Coordinating between sources, content generation, and other modules
 * - Managing the execution lifecycle of automation rules
 * - Providing event-driven architecture for module communication
 */
export interface AutomationOrchestrator {
  /**
   * Handles new feed items detected event from sources module
   */
  handleNewFeedItems(request: HandleNewFeedItemsRequest): Promise<Result<HandleNewFeedItemsResponse, Error>>;

  /**
   * Evaluates all active automation rules for a given context
   */
  evaluateRulesForContext(context: AutomationContext): Promise<Result<RuleEvaluationResult[], Error>>;

  /**
   * Executes automation actions for triggered rules
   */
  executeAutomationActions(executions: AutomationExecution[]): Promise<Result<AutomationExecutionResult[], Error>>;

  /**
   * Gets automation rules for a specific source
   */
  getRulesForSource(sourceId: string): Promise<Result<AutomationRule[], Error>>;

  /**
   * Creates a new automation rule
   */
  createRule(request: CreateAutomationRuleRequest): Promise<Result<AutomationRule, Error>>;

  /**
   * Updates an existing automation rule
   */
  updateRule(ruleId: AutomationRuleId, updates: UpdateAutomationRuleRequest): Promise<Result<AutomationRule, Error>>;

  /**
   * Enables or disables an automation rule
   */
  setRuleEnabled(ruleId: AutomationRuleId, enabled: boolean): Promise<Result<void, Error>>;

  /**
   * Deletes an automation rule
   */
  deleteRule(ruleId: AutomationRuleId): Promise<Result<void, Error>>;

  /**
   * Gets execution history for automation rules
   */
  getExecutionHistory(filters: AutomationHistoryFilters): Promise<Result<AutomationExecutionHistory[], Error>>;
}

/**
 * Request to handle new feed items from sources module
 */
export interface HandleNewFeedItemsRequest {
  sourceId: string;
  feedItems: NewFeedItemData[];
  sourceConfiguration: Record<string, any>;
}

export interface NewFeedItemData {
  id: string;
  guid: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
  fetchedAt: Date;
}

/**
 * Response from handling new feed items
 */
export interface HandleNewFeedItemsResponse {
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

/**
 * Result of evaluating a single automation rule
 */
export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  shouldExecute: boolean;
  reason: string;
  context: AutomationContext;
  evaluatedAt: Date;
}

/**
 * Request to execute automation actions
 */
export interface AutomationExecution {
  ruleId: string;
  ruleName: string;
  context: AutomationContext;
  actionsToExecute: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  evaluatedAt: Date;
}

/**
 * Result of executing automation actions
 */
export interface AutomationExecutionResult {
  ruleId: string;
  ruleName: string;
  success: boolean;
  actionsExecuted: ActionExecutionResult[];
  duration: number;
  executedAt: Date;
  error?: string;
}

export interface ActionExecutionResult {
  actionType: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

/**
 * Request to create a new automation rule
 */
export interface CreateAutomationRuleRequest {
  sourceId: string;
  name: string;
  description?: string;
  trigger: {
    type: string;
    parameters: Record<string, any>;
  };
  conditions: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  actions: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  isEnabled?: boolean;
}

/**
 * Request to update an automation rule
 */
export interface UpdateAutomationRuleRequest {
  name?: string;
  description?: string;
  trigger?: {
    type: string;
    parameters: Record<string, any>;
  };
  conditions?: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  actions?: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  isEnabled?: boolean;
}

/**
 * Filters for automation execution history
 */
export interface AutomationHistoryFilters {
  sourceId?: string;
  ruleId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Automation execution history entry
 */
export interface AutomationExecutionHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  sourceId: string;
  sourceName: string;
  executedAt: Date;
  duration: number;
  success: boolean;
  actionsExecuted: number;
  articlesGenerated: number;
  error?: string;
  context: AutomationContext;
  results: AutomationExecutionResult;
}