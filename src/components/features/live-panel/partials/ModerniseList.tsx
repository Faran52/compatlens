import { For, Show } from 'solid-js';

import { locationLabelFor } from '@engine';

import type { Suggestion } from '@engine';
import type { JSX } from 'solid-js';

interface ModerniseListProps {
  suggestions: readonly Suggestion[];
  targeted: number;
}

export const ModerniseList = (props: ModerniseListProps): JSX.Element => {
  return (
    <Show
      fallback={(
        <p class="p-5 text-center text-text-muted">
          Nothing to modernise. No legacy prefixes were found in the CSS that was read.
        </p>
      )}
      when={props.suggestions.length > 0}
    >
      <div class="p-2">
        <p class="mb-2 border-l-2 border-accent bg-surface-raised p-2">
          <b>{`${String(props.suggestions.length)} safe to modernise.`}</b>
          {` Every replacement below already works on all ${String(props.targeted)} browsers you target.`}
        </p>
        <For each={props.suggestions}>
          {(suggestion) => {
            return (
              <div
                class="
                  rounded-sm p-2
                  hover:bg-surface-raised
                "
                data-rule={suggestion.ruleId}
              >
                <div class="flex flex-wrap items-center gap-2">
                  <code class="
                    rounded-sm text-xs bg-surface-raised px-1 font-mono
                  "
                  >
                    {suggestion.syntax}
                  </code>
                  <span aria-hidden="true">→</span>
                  <code class="
                    rounded-sm text-xs bg-surface-raised px-1 font-mono
                  "
                  >
                    {suggestion.replacementSyntax}
                  </code>
                  <span class="
                    text-xs font-semibold rounded-full bg-degrades-surface px-2
                    text-degrades
                  "
                  >
                    safe
                  </span>
                  <span class="ml-auto font-mono text-[10px] text-text-muted">
                    {locationLabelFor(suggestion.location)}
                  </span>
                </div>
                <p class="text-xs mt-1 text-text-muted">
                  {suggestion.advice}
                  <Show when={suggestion.baselineDate}>
                    {(date) => {
                      return <span>{` Baseline since ${date()}.`}</span>;
                    }}
                  </Show>
                  {' '}
                  <a href={suggestion.mdnUrl} rel="noreferrer noopener" target="_blank">
                    {suggestion.name}
                  </a>
                </p>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
