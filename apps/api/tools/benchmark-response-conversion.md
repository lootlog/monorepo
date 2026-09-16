# Response conversion benchmark

From the repository root, run:

```sh
bun --conditions=development apps/api/tools/benchmark-response-conversion.ts
```

The command checks serialized output equality and writes JSON lines with operation timings, payload bytes, CPU milliseconds per request, requests per second, in-memory HTTP response p50/p95/p99, and event-loop delay p50/p95/p99. It starts only a disposable loopback OTLP collector, never the application. Allow about two minutes on an otherwise idle machine. Pass a case-name substring as the final argument, for example `"chat messages"`, to run only matching cases.

## Method

The baseline calls the existing `decodeDomainJson` with the public response schema. The current path calls the actual timer decoder or exported chat/party domain schema. Both construct their decoder effect for every operation and request, because schema work can run eagerly during effect construction.

Timer and chat operation results are medians of five batches of 100 calls after 20 warmups. Party results are medians of five batches of 1000 calls after 100 warmups. Fixtures contain 100 or 1000 timers, with and without member/actor relations, 100 chat messages, or 20 active party summaries. Member fixtures include nested dates and nullable timestamps. Chat timestamps are ISO strings, matching their producer. Fixtures are synthetic, with no private data. The party fixture is newly constructed and differs from the investigation fixture; its ratio is not a reproduction of the original 41× result.

The route benchmark uses Effect `HttpApiBuilder` and `HttpRouter.toWebHandler`, including the concrete public success schema and JSON response encoding. Each variant warms up with 20 requests, then runs batches of eight concurrent requests for at least 5.5 seconds, yielding between batches. Response latency includes reading the response body. CPU/request uses process CPU time and includes fixture client work, garbage collection and local telemetry collection. Event-loop delay measures lateness of a 5 ms timer, rather than the production metric's one-second timer. Each route variant has one measurement window; operation results use five batches.

Routes load the production `makeObservabilityLayer`, including sampled tracing, async span context, runtime metrics and OTLP exporters. A disposable loopback sink consumes exports. Exporters retain their configured/default batching intervals. HTTP request logging is disabled. Database, authorization, application services, production collector latency, socket I/O and request network transport are excluded. These are in-memory HTTP measurements, not production HTTP percentiles or capacity estimates.

## Measurement status

The code baseline was `480f73c12`; the run used Bun 1.4.2 on 2026-09-16. The deployed revision and real payload-size distributions were not available to this harness and remain unverified. The synthetic results do not establish whole-service speedup or explain the incident's total CPU use.

## Local results

One measurement per case with other repository checks stopped; chat was measured separately after matching its fixture to the ISO-string producer. Values show legacy → current.

| Synthetic payload          |  Bytes | Median ms/operation | Ratio |
| -------------------------- | -----: | ------------------: | ----: |
| 100 timers                 |  38271 |     1.8464 → 0.2956 |  6.2× |
| 100 timers with relations  |  78271 |     4.4547 → 0.7434 |  6.0× |
| 1000 timers                | 385671 |    24.1549 → 3.4375 |  7.0× |
| 1000 timers with relations | 785671 |    51.3422 → 8.3689 |  6.1× |
| 100 chat messages          |  27191 |     1.4978 → 0.1868 |  8.0× |
| 20 active parties          |   4511 |     0.2246 → 0.0536 |  4.2× |

| Synthetic route payload    |  CPU ms/request |   Requests/s | HTTP p50/p95/p99 ms                        | Event-loop p50/p95/p99 ms          |
| -------------------------- | --------------: | -----------: | ------------------------------------------ | ---------------------------------- |
| 100 timers                 |   2.573 → 0.478 |   428 → 2239 | 16.86/20.32/22.75 → 1.82/3.64/4.96         | 0.74/2.09/3.39 → 1.53/3.27/4.80    |
| 100 timers with relations  |   5.768 → 1.224 |    185 → 885 | 37.88/54.52/70.96 → 5.93/8.90/11.89        | 0.75/3.99/5.55 → 3.57/6.67/9.23    |
| 1000 timers                |  26.413 → 5.520 |     41 → 205 | 186.41/208.64/234.11 → 31.26/40.63/54.33   | 0.85/2.28/12.53 → 1.63/9.54/13.28  |
| 1000 timers with relations | 52.593 → 13.899 |      20 → 81 | 368.26/399.76/411.60 → 80.70/104.73/127.49 | 0.84/2.26/45.28 → 1.25/24.59/32.23 |
| 100 chat messages          |   1.975 → 0.276 |   557 → 3917 | 12.80/15.37/17.03 → 1.06/2.00/2.92         | 0.65/1.88/2.81 → 0.42/1.96/2.62    |
| 20 active parties          |   0.324 → 0.099 | 3221 → 10095 | 1.23/2.26/2.75 → 0.38/0.72/1.05            | 0.90/2.66/3.32 → 0.06/0.85/1.37    |

CPU/request and HTTP response latency improved in all measured fixtures. Timer event-loop delay did not improve consistently; different cooperative scheduling may contribute. This run does not establish a production event-loop improvement.
