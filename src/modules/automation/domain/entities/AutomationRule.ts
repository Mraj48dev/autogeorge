import { Result } from '../../shared/domain/types/Result';

/**
 * Automation Rule Entity
 *
 * Represents a rule that defines when and how to automatically generate content.
 * Encapsulates the business logic for automation triggers and conditions.
 */
export class AutomationRule {
  constructor(
    public readonly id: AutomationRuleId,
    public readonly sourceId: string,
    public readonly name: string,
    public readonly isEnabled: boolean,
    public readonly trigger: AutomationTrigger,
    public readonly conditions: AutomationCondition[],
    public readonly actions: AutomationAction[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly lastExecutedAt?: Date,
    public readonly executionCount: number = 0
  ) {}

  /**
   * Creates a new automation rule
   */
  static create(
    sourceId: string,
    name: string,
    trigger: AutomationTrigger,
    conditions: AutomationCondition[] = [],
    actions: AutomationAction[] = []
  ): Result<AutomationRule, string> {
    try {
      if (!sourceId?.trim()) {
        return Result.failure('Source ID is required');
      }

      if (!name?.trim()) {
        return Result.failure('Automation rule name is required');
      }

      if (!trigger) {
        return Result.failure('Trigger is required');
      }

      if (actions.length === 0) {
        return Result.failure('At least one action is required');
      }

      const rule = new AutomationRule(
        AutomationRuleId.generate(),
        sourceId,
        name.trim(),
        true, // Enabled by default
        trigger,
        conditions,
        actions,
        new Date(),
        new Date()
      );

      return Result.success(rule);
    } catch (error) {
      return Result.failure(`Failed to create automation rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Evaluates if this rule should be executed for given context
   */
  shouldExecute(context: AutomationContext): boolean {
    if (!this.isEnabled) {
      return false;
    }

    // Check trigger matches
    if (!this.trigger.matches(context)) {
      return false;
    }

    // Check all conditions are met
    return this.conditions.every(condition => condition.evaluate(context));
  }

  /**
   * Updates the execution statistics
   */
  recordExecution(): AutomationRule {
    return new AutomationRule(
      this.id,
      this.sourceId,
      this.name,
      this.isEnabled,
      this.trigger,
      this.conditions,
      this.actions,
      this.createdAt,
      new Date(), // updatedAt
      new Date(), // lastExecutedAt
      this.executionCount + 1
    );
  }

  /**
   * Enables or disables the rule
   */
  setEnabled(enabled: boolean): AutomationRule {
    return new AutomationRule(
      this.id,
      this.sourceId,
      this.name,
      enabled,
      this.trigger,
      this.conditions,
      this.actions,
      this.createdAt,
      new Date(),
      this.lastExecutedAt,
      this.executionCount
    );
  }
}

/**
 * Value object for Automation Rule ID
 */
export class AutomationRuleId {
  constructor(private readonly value: string) {
    if (!value?.trim()) {
      throw new Error('Automation rule ID cannot be empty');
    }
  }

  getValue(): string {
    return this.value;
  }

  static generate(): AutomationRuleId {
    return new AutomationRuleId(`automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  static fromString(value: string): AutomationRuleId {
    return new AutomationRuleId(value);
  }

  equals(other: AutomationRuleId): boolean {
    return this.value === other.value;
  }
}

/**
 * Automation Trigger - defines what event triggers the automation
 */
export interface AutomationTrigger {
  type: AutomationTriggerType;
  matches(context: AutomationContext): boolean;
}

export enum AutomationTriggerType {
  NEW_FEED_ITEMS = 'new_feed_items',
  SCHEDULED = 'scheduled',
  MANUAL = 'manual'
}

/**
 * Automation Condition - additional criteria that must be met
 */
export interface AutomationCondition {
  type: AutomationConditionType;
  parameters: Record<string, any>;
  evaluate(context: AutomationContext): boolean;
}

export enum AutomationConditionType {
  TIME_RANGE = 'time_range',
  ITEM_COUNT = 'item_count',
  CONTENT_FILTER = 'content_filter',
  SOURCE_STATUS = 'source_status'
}

/**
 * Automation Action - what to do when rule is triggered
 */
export interface AutomationAction {
  type: AutomationActionType;
  parameters: Record<string, any>;
}

export enum AutomationActionType {
  GENERATE_ARTICLES = 'generate_articles',
  SEND_NOTIFICATION = 'send_notification',
  UPDATE_SOURCE = 'update_source',
  CREATE_TASK = 'create_task'
}

/**
 * Automation Context - data available during rule evaluation
 */
export interface AutomationContext {
  sourceId: string;
  trigger: {
    type: AutomationTriggerType;
    timestamp: Date;
    data: Record<string, any>;
  };
  newFeedItems?: Array<{
    id: string;
    guid: string;
    title: string;
    content: string;
    publishedAt: Date;
  }>;
  source?: {
    id: string;
    name: string;
    type: string;
    status: string;
    configuration: Record<string, any>;
  };
}