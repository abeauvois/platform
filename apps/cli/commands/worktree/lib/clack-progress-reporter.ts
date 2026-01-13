import * as p from '@clack/prompts';
import type { IProgressReporter } from './types.js';

/**
 * CLI adapter for IProgressReporter using @clack/prompts
 */
export class ClackProgressReporter implements IProgressReporter {
	private spinner = p.spinner();

	start(message: string): void {
		this.spinner.start(message);
	}

	update(message: string): void {
		this.spinner.message(message);
	}

	stop(message: string): void {
		this.spinner.stop(message);
	}

	info(message: string): void {
		p.log.info(message);
	}

	warn(message: string): void {
		p.log.warn(message);
	}

	error(message: string): void {
		p.log.error(message);
	}

	note(content: string, title: string): void {
		p.note(content, title);
	}
}
