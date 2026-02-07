import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { EditorState, type Extension, type Transaction } from "@codemirror/state";
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
  type Completion,
} from "@codemirror/autocomplete";

// ── Variable Highlighting ──

const resolvedMark = Decoration.mark({ class: "cm-variable-resolved" });
const unresolvedMark = Decoration.mark({ class: "cm-variable-unresolved" });

/**
 * Highlights {{variable}} patterns in the editor.
 * Resolved variables get amber background, unresolved get red wavy underline.
 */
export function variableHighlight(
  isResolved: (name: string) => boolean,
): Extension {
  return ViewPlugin.define(
    (view) => {
      return {
        decorations: buildDecorations(view, isResolved),
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = buildDecorations(update.view, isResolved);
          }
        },
      };
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}

function buildDecorations(
  view: EditorView,
  isResolved: (name: string) => boolean,
): DecorationSet {
  const decorations: { from: number; to: number; deco: Decoration }[] = [];
  const doc = view.state.doc.toString();
  const pattern = /\{\{([^{}]+?)\}\}/g;
  let match;

  while ((match = pattern.exec(doc)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    const name = match[1].trim();
    const deco = isResolved(name) ? resolvedMark : unresolvedMark;
    decorations.push({ from, to, deco });
  }

  return Decoration.set(
    decorations.map((d) => d.deco.range(d.from, d.to)),
  );
}

// ── Variable Autocomplete ──

export interface VariableCompletionItem {
  name: string;
  value: string;
  source: string;
  secret: boolean;
}

/**
 * Provides autocomplete for {{variable}} patterns.
 * Triggers when user types `{{`.
 */
export function variableAutocomplete(
  getVariables: () => VariableCompletionItem[],
): Extension {
  return autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        // Look for {{ before cursor
        const before = context.matchBefore(/\{\{[\w\s]*/);
        if (!before) return null;

        const variables = getVariables();
        if (variables.length === 0) return null;

        // The prefix after {{ is what we filter on
        const prefix = before.text.replace(/^\{\{/, "").trim().toLowerCase();

        const options: Completion[] = variables
          .filter((v) => !prefix || v.name.toLowerCase().includes(prefix))
          .map((v) => ({
            label: v.name,
            detail: v.secret ? "•••" : v.value,
            info: v.source,
            apply: (view: EditorView, _completion: Completion, _from: number, to: number) => {
              const insertText = `{{${v.name}}}`;
              const startPos = before.from;
              view.dispatch({
                changes: { from: startPos, to, insert: insertText },
                selection: { anchor: startPos + insertText.length },
              });
            },
          }));

        return {
          from: before.from,
          options,
          filter: false,
        };
      },
    ],
  });
}

// ── Single-Line Mode ──

/**
 * Constrains the editor to a single line (for URL bar).
 * Rejects newlines via transaction filter.
 */
export function singleLine(): Extension {
  return [
    EditorState.transactionFilter.of((tr: Transaction) => {
      if (tr.newDoc.lines > 1) {
        const newContent = tr.newDoc.sliceString(0).replace(/\n/g, "");
        return {
          changes: {
            from: 0,
            to: tr.startState.doc.length,
            insert: newContent,
          },
          selection: { anchor: Math.min(tr.selection?.main.anchor ?? newContent.length, newContent.length) },
        };
      }
      return tr;
    }),
  ];
}
