# When to Use Job Queues vs Simple Promises

## Use Simple Promises/`async`-`await` When:

1. **Tasks complete quickly** (< few seconds)
2. **Failure is acceptable** - if the server crashes, losing the task is okay
3. **No retry logic needed** - one-shot operations
4. **Request-response pattern** - caller waits for the result
5. **Low volume** - not worried about overwhelming downstream services

## Use a Job Queue When:

1. **Durability required** - tasks must survive server restarts/crashes
2. **Retries with backoff** - failed jobs should retry automatically
3. **Rate limiting** - need to control throughput to external APIs
4. **Delayed execution** - schedule jobs for later (e.g., "send email in 1 hour")
5. **Long-running tasks** - operations taking minutes/hours
6. **Decoupling** - separate the "accept work" from "do work" concerns
7. **Visibility** - need to monitor pending/failed jobs, view history
8. **Concurrency control** - limit how many jobs run simultaneously
9. **Priority queues** - some jobs should run before others

## Practical Examples

| Scenario                 | Recommendation                                     |
| ------------------------ | -------------------------------------------------- |
| Validate user input      | Promise                                            |
| Send welcome email       | Job queue (retries, survives crashes)              |
| Fetch data from cache    | Promise                                            |
| Process uploaded file    | Job queue (long-running, needs progress tracking)  |
| Sync with external API   | Job queue (rate limiting, retries)                 |
| Calculate dashboard stats| Promise (if fast) or Job queue (if expensive)      |

## pg-boss vs BullMQ

- **pg-boss**: Uses PostgreSQL - good if you already have Postgres and want fewer dependencies
- **BullMQ**: Uses Redis - higher throughput, more features, better for high-volume scenarios

This project uses pg-boss since PostgreSQL is already part of the stack, avoiding the need for Redis infrastructure.
