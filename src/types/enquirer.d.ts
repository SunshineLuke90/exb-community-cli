/**
 * Focused ambient type declaration for the `enquirer` package.
 *
 * enquirer ships a very thin `index.d.ts` (export = Enquirer) that does not
 * expose individual prompt constructors like `Select`.  Those constructors ARE
 * present at runtime as non-enumerable own properties of the exported class.
 *
 * This file replaces the bundled declaration with one that:
 *   • keeps the core `Enquirer` class and its `export =` shape
 *   • adds a typed `Select` class (constructor + `run()` return type)
 *   • declares `Enquirer.Select` as an explicit static property so that
 *     `import Enquirer from 'enquirer'` followed by `new Enquirer.Select(…)`
 *     gives full IDE type-checking and auto-complete with zero `as any` casts.
 *
 * NOTE: this is an *ambient* declaration (no top-level `import`/`export`),
 * so it shadows the package's bundled types. Add more prompt classes here as
 * needed.
 */

declare module "enquirer" {
	/** A single entry in a Select choice list. */
	interface SelectChoice {
		/** Raw value returned by `prompt.run()` when this choice is selected. */
		name: string
		/** Display label shown in the terminal (falls back to `name` if omitted). */
		message?: string
		/** Alias for `name`; some enquirer versions accept this instead. */
		value?: string
		/** Greyed-out hint shown to the right of the label. */
		hint?: string
		/** Disables the entry; pass a string to show a custom disabled reason. */
		disabled?: boolean | string
	}

	/** Options accepted by the `Select` constructor. */
	interface SelectOptions {
		/** Key used for this prompt in the answers object. */
		name: string | (() => string)
		/** Question text displayed above the choice list. */
		message: string | (() => string)
		/** Choices to display — either plain strings or `SelectChoice` objects. */
		choices: Array<string | SelectChoice>
		/**
		 * Maximum number of choices visible at once.
		 * The list scrolls when there are more entries than this.
		 */
		limit?: number
		/** Zero-based index (or value string) of the initially highlighted item. */
		initial?: number | string
		/** Transform the submitted value before it is returned from `run()`. */
		result?(value: string): string | Promise<string>
		/** Format the active value while the prompt is rendered. */
		format?(value: string): string | Promise<string>
	}

	/**
	 * Single-value selection prompt.
	 *
	 * Renders a scrollable list; arrow keys navigate, Enter confirms.
	 * `run()` resolves with the `name` (or `value`) of the chosen entry.
	 */
	class Select {
		constructor(options: SelectOptions)
		run(): Promise<string>
	}

	/** Core Enquirer class — exposes `Select` (and other prompts) as statics. */
	class Enquirer {
		/** Single-value selection prompt constructor. */
		static Select: typeof Select
		static Confirm: typeof Confirm
	}

	export = Enquirer
}
