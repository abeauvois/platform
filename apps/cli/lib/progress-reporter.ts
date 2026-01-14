import * as p from '@clack/prompts';

/**
 * Port interface for progress reporting (decouples business logic from CLI presentation)
 */
export interface IProgressReporter {
	start(message: string): void;
	update(message: string): void;
	stop(message: string): void;
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
	note(content: string, title: string): void;
}

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
