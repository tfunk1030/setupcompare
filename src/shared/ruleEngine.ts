import rules from './rules/defaultRules.json';
import { ParameterDelta, SetupProfile } from './types';

type RuleDefinition = (typeof rules)[number];

export class RuleEngine {
  private ruleSet: RuleDefinition[];

  constructor(definitions: RuleDefinition[] = rules) {
    this.ruleSet = definitions;
  }

  public apply(deltas: ParameterDelta[], profile?: SetupProfile): ParameterDelta[] {
    return deltas.map((delta) => {
      const rule = this.findRule(delta.key, profile);
      if (!rule) return delta;
      const direction = typeof delta.delta === 'number' && delta.delta < 0 ? 'decrease' : 'increase';
      const deltaWithUnit = `${delta.delta}${delta.unit ? ` ${delta.unit}` : ''}`;
      const context = {
        delta: `${delta.delta}`,
        deltaWithUnit,
        direction,
        balance: direction === 'increase' ? 'rearward' : 'forward',
      } as Record<string, string>;

      const short = this.render(rule.shortTemplate, context);
      const full = this.render(rule.fullTemplate, context);

      return {
        ...delta,
        interpretation: { short, full },
        insight: rule.effect,
      };
    });
  }

  private findRule(key: string, profile?: SetupProfile): RuleDefinition | undefined {
    return this.ruleSet.find((rule) => {
      const matchesKey = rule.keyIncludes.every((fragment) => key.includes(fragment));
      if (!matchesKey) return false;
      if (!rule.contexts) return true;
      const { carModel, trackCategory } = rule.contexts as any;
      if (carModel && profile?.carModel && !carModel.includes(profile.carModel)) return false;
      if (trackCategory && profile?.trackCategory && !trackCategory.includes(profile.trackCategory)) return false;
      return true;
    });
  }

  private render(template: string, context: Record<string, string>) {
    return template.replace(/\{([^}]+)\}/g, (_, key) => {
      const trimmed = key.trim();
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(...Object.keys(context), `return ${trimmed};`);
        return String(fn(...Object.values(context)));
      } catch (e) {
        return context[trimmed] ?? '';
      }
    });
  }
}

export const defaultRuleEngine = new RuleEngine();
