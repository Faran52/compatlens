import { cx } from '@utils';
import { For } from 'solid-js';

import { tabIdForKey } from './utils/tabUtils';

import type { JSX } from 'solid-js';
import type { TabDefinition } from './utils/tabUtils';

interface TabsProps {
  tabs: readonly TabDefinition[];
  active: string;
  onSelect: (id: string) => void;
  children?: JSX.Element;
}

export const Tabs = (props: TabsProps): JSX.Element => {
  return (
    <div class="flex items-center gap-0.5 border-b border-hairline bg-surface px-2" role="tablist">
      <For each={props.tabs}>
        {(tab) => {
          return (
            <button
              aria-controls={tab.panelId}
              aria-selected={props.active === tab.id}
              class={cx(
                'cursor-pointer border-b-2 px-3 py-2',
                props.active === tab.id
                  ? 'border-accent font-semibold text-text'
                  : 'border-transparent text-text-muted',
              )}
              id={tab.tabId}
              onClick={() => {
                props.onSelect(tab.id);
              }}
              onKeyDown={(event) => {
                const nextId = tabIdForKey(props.tabs, props.active, event.key);

                if (nextId === undefined) {
                  return;
                }

                event.preventDefault();
                props.onSelect(nextId);

                const nextTab = props.tabs.find((candidate) => {
                  return candidate.id === nextId;
                });

                if (nextTab !== undefined) {
                  document.getElementById(nextTab.tabId)?.focus();
                }
              }}
              role="tab"
              tabindex={props.active === tab.id ? 0 : -1}
              type="button"
            >
              {tab.label}
              <span class="ml-1.5 opacity-75 tabular-nums">{tab.count}</span>
            </button>
          );
        }}
      </For>
      {props.children}
    </div>
  );
};
