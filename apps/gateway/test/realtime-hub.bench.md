# Local gateway publication benchmark

LOO-57 compares the gateway before and after reusing the validated local frame. These are synthetic in-process measurements; they do not establish production capacity.

## Reproduce

Run `bun run --cwd apps/gateway perf:routing` from the repository root. The command prints one JSON record per scenario and asserts the expected delivery count. It does not start the application or connect to Redis.

Recorded on 2026-09-16 with Bun 1.4.2, Linux x86-64, AMD Ryzen 7 9850X3D (16 logical CPUs). Baseline: `7b14bdb1f` hub and protocol codec. Candidate: the LOO-57 implementation accompanying this report. The benchmark harness is identical on both sides. Three paired runs alternate baseline/candidate, candidate/baseline, baseline/candidate. Values below are medians of the three runs, not confidence intervals.

Each publication scenario uses 1,000 warmup and 10,000 measured publications. Socket sends and Redis publishes are successful no-ops; registry writes are disabled. Remote publications enter through the registered federation callback with a parsed outer envelope and base64 frame, exercising binary decode and validation. Local publications include federation envelope creation. Fanout is either one or 50 authorized connections. One member owns the Organization; other members have timer, hero-timer and chat read permissions. Chat fanout exercises both deletion permission outcomes. Mixed encoding alternates JSON and MessagePack; at fanout one it is JSON only.

CPU is process user plus system time per publication, including runtime GC and background threads. Throughput excludes waits between batches. Publication latency includes the awaited publish operation but excludes network delivery. Event-loop timer delay is the elapsed time of a zero-delay timer armed before each batch of 100 publications, giving 100 timer samples per scenario per run. It measures responsiveness under synthetic bursts and includes timer scheduling granularity.

The payloads below are small synthetic examples, not production captures. These results do not cover large payloads, backpressure, Redis latency, slow sockets or production traffic mixes. All metrics can vary with JIT compilation, GC and scheduling; remote controls must be considered alongside local gains.

## Payload size

| Event    | MessagePack bytes | JSON UTF-8 bytes |
| -------- | ----------------: | ---------------: |
| timer    |               240 |              305 |
| chat     |               225 |              270 |
| map-ping |               144 |              195 |

## CPU and throughput

Each cell shows baseline → candidate. A negative CPU change is an improvement.

| Event    | Origin | Encoding | Fanout | CPU µs/publication | CPU change |  Publications/s |
| -------- | ------ | -------- | -----: | -----------------: | ---------: | --------------: |
| timer    | local  | msgpack  |      1 |     12.847 → 9.982 |     -22.3% | 109145 → 147183 |
| timer    | local  | msgpack  |     50 |    30.633 → 28.936 |      -5.5% |   35506 → 37824 |
| timer    | local  | json     |      1 |     10.268 → 6.713 |     -34.6% | 111819 → 161380 |
| timer    | local  | json     |     50 |    30.335 → 27.211 |     -10.3% |   34361 → 38565 |
| timer    | local  | mixed    |      1 |      9.941 → 6.877 |     -30.8% | 117088 → 164110 |
| timer    | local  | mixed    |     50 |    31.628 → 28.562 |      -9.7% |   33577 → 38172 |
| timer    | remote | msgpack  |      1 |    11.298 → 13.639 |     +20.7% | 114807 → 106043 |
| timer    | remote | msgpack  |     50 |    36.044 → 31.525 |     -12.5% |   30254 → 35011 |
| timer    | remote | json     |      1 |      7.378 → 6.382 |     -13.5% | 139765 → 181620 |
| timer    | remote | json     |     50 |    33.955 → 28.562 |     -15.9% |   32105 → 38973 |
| timer    | remote | mixed    |      1 |      9.832 → 6.231 |     -36.6% | 102350 → 163378 |
| timer    | remote | mixed    |     50 |    33.388 → 31.976 |      -4.2% |   31052 → 34042 |
| chat     | local  | msgpack  |      1 |    29.756 → 27.627 |      -7.2% |   57950 → 68592 |
| chat     | local  | msgpack  |     50 |  111.048 → 114.363 |      +3.0% |    9983 → 10469 |
| chat     | local  | json     |      1 |    14.729 → 11.226 |     -23.8% |   76176 → 97111 |
| chat     | local  | json     |     50 |  101.092 → 105.391 |      +4.3% |   10323 → 10991 |
| chat     | local  | mixed    |      1 |    13.347 → 10.417 |     -22.0% |   78998 → 99575 |
| chat     | local  | mixed    |     50 |  106.898 → 112.692 |      +5.4% |    9809 → 10222 |
| chat     | remote | msgpack  |      1 |    12.461 → 14.918 |     +19.7% |   85179 → 83722 |
| chat     | remote | msgpack  |     50 |     99.94 → 98.924 |      -1.0% |   10446 → 10587 |
| chat     | remote | json     |      1 |    10.648 → 11.494 |      +7.9% |   99072 → 99037 |
| chat     | remote | json     |     50 |    92.478 → 92.212 |      -0.3% |   11192 → 11361 |
| chat     | remote | mixed    |      1 |    10.271 → 10.026 |      -2.4% | 101686 → 104350 |
| chat     | remote | mixed    |     50 |   106.433 → 96.418 |      -9.4% |    9796 → 10853 |
| map-ping | local  | msgpack  |      1 |      8.277 → 5.374 |     -35.1% | 134736 → 190281 |
| map-ping | local  | msgpack  |     50 |     10.172 → 7.578 |     -25.5% | 111170 → 154923 |
| map-ping | local  | json     |      1 |       8.93 → 5.251 |     -41.2% | 116574 → 197281 |
| map-ping | local  | json     |     50 |      9.977 → 6.813 |     -31.7% | 105655 → 150360 |
| map-ping | local  | mixed    |      1 |      9.036 → 6.569 |     -27.3% | 125712 → 180917 |
| map-ping | local  | mixed    |     50 |      8.917 → 6.421 |     -28.0% | 117426 → 161230 |
| map-ping | remote | msgpack  |      1 |      8.716 → 9.825 |     +12.7% | 135285 → 128536 |
| map-ping | remote | msgpack  |     50 |     8.196 → 10.376 |     +26.6% | 123706 → 118849 |
| map-ping | remote | json     |      1 |      4.665 → 5.171 |     +10.8% | 214591 → 193644 |
| map-ping | remote | json     |     50 |       6.021 → 6.19 |      +2.8% | 166298 → 161763 |
| map-ping | remote | mixed    |      1 |      5.433 → 5.883 |      +8.3% | 198647 → 196178 |
| map-ping | remote | mixed    |     50 |     9.194 → 12.179 |     +32.5% | 112508 → 101989 |

## Latency and event-loop delay

Each cell shows baseline → candidate. Publication latency is in microseconds; timer delay is in milliseconds.

| Event    | Origin | Encoding | Fanout |  Latency p50 µs |    Latency p95 µs |    Latency p99 µs |    Timer p95 ms |    Timer p99 ms |
| -------- | ------ | -------- | -----: | --------------: | ----------------: | ----------------: | --------------: | --------------: |
| timer    | local  | msgpack  |      1 |     7.92 → 5.77 |      14.73 → 9.71 |    27.59 → 15.739 |   1.713 → 1.284 |   1.848 → 2.143 |
| timer    | local  | msgpack  |     50 |  26.27 → 23.359 |    32.69 → 39.599 |    44.659 → 49.46 |   3.728 → 3.712 |   3.857 → 4.439 |
| timer    | local  | json     |      1 |     7.84 → 5.47 |     12.929 → 8.32 |    21.589 → 14.74 |    1.64 → 1.061 |    1.84 → 1.827 |
| timer    | local  | json     |     50 |   26.29 → 23.47 |    37.469 → 35.25 |     54.33 → 47.59 |   3.688 → 3.343 |   3.951 → 3.463 |
| timer    | local  | mixed    |      1 |    7.43 → 5.459 |      12.76 → 8.23 |     18.249 → 14.2 |   1.511 → 1.099 |   1.748 → 1.651 |
| timer    | local  | mixed    |     50 |   26.7 → 23.709 |    35.24 → 35.299 |     51.8 → 48.919 |   3.672 → 3.343 |   3.828 → 4.143 |
| timer    | remote | msgpack  |      1 |      7.8 → 8.39 |     11.86 → 14.25 |    18.859 → 22.64 |   1.478 → 1.453 |   1.909 → 2.121 |
| timer    | remote | msgpack  |     50 |  27.77 → 26.269 |     52.18 → 32.85 |   69.869 → 49.329 |   4.619 → 3.498 |   5.221 → 3.808 |
| timer    | remote | json     |      1 |     6.17 → 5.02 |      10.95 → 7.95 |    21.64 → 16.869 |   1.171 → 1.097 |   2.364 → 1.748 |
| timer    | remote | json     |     50 |   25.99 → 23.85 |    48.659 → 31.18 |   58.989 → 44.569 |    4.54 → 3.226 |   5.007 → 3.334 |
| timer    | remote | mixed    |      1 |     8.32 → 5.36 |      14.18 → 8.87 |     30.68 → 16.95 |   1.429 → 1.087 |   2.381 → 1.767 |
| timer    | remote | mixed    |     50 |  27.52 → 26.639 |     49.81 → 36.66 |    69.989 → 51.81 |   3.982 → 3.592 |   5.227 → 4.226 |
| chat     | local  | msgpack  |      1 |   14.17 → 11.97 |    25.63 → 21.169 |     37.83 → 30.54 |   2.662 → 2.593 |   3.181 → 3.315 |
| chat     | local  | msgpack  |     50 |  84.349 → 79.57 | 142.399 → 138.919 | 210.109 → 182.819 |  12.224 → 11.21 | 13.429 → 13.518 |
| chat     | local  | json     |      1 |    11.22 → 8.52 |     18.54 → 14.82 |     26.47 → 23.15 |   2.199 → 1.987 |   2.419 → 2.386 |
| chat     | local  | json     |     50 |   80.5 → 74.779 | 137.709 → 133.709 | 175.579 → 195.669 | 11.225 → 11.816 | 11.763 → 12.406 |
| chat     | local  | mixed    |      1 |    10.85 → 8.48 |     18.09 → 12.78 |    26.409 → 21.74 |   2.246 → 1.881 |   2.738 → 2.112 |
| chat     | local  | mixed    |     50 |  84.98 → 79.739 | 143.169 → 151.339 | 180.398 → 237.808 |  11.693 → 13.25 | 12.884 → 15.458 |
| chat     | remote | msgpack  |      1 |  10.27 → 10.139 |    15.93 → 17.179 |      20.8 → 23.68 |   2.169 → 2.095 |   2.362 → 2.607 |
| chat     | remote | msgpack  |     50 |  78.819 → 78.54 | 136.589 → 128.129 | 173.629 → 174.499 |  11.043 → 11.25 |  12.24 → 12.362 |
| chat     | remote | json     |      1 |     8.44 → 8.58 |    14.57 → 14.929 |     22.13 → 36.42 |   1.878 → 1.913 |   2.114 → 2.247 |
| chat     | remote | json     |     50 |    73.8 → 73.48 |  123.01 → 107.729 | 176.459 → 149.139 | 10.636 → 10.061 | 12.725 → 11.922 |
| chat     | remote | mixed    |      1 |      8.3 → 8.16 |    14.139 → 12.66 |     19.58 → 20.67 |   1.896 → 1.795 |   2.063 → 2.081 |
| chat     | remote | mixed    |     50 | 83.609 → 79.439 | 151.708 → 109.229 | 227.728 → 154.959 | 13.089 → 10.476 | 14.599 → 10.851 |
| map-ping | local  | msgpack  |      1 |     6.73 → 4.72 |         10 → 7.29 |     14.94 → 11.96 |   1.475 → 1.067 |    2.068 → 1.79 |
| map-ping | local  | msgpack  |     50 |     8.07 → 5.76 |      13.65 → 8.21 |     18.65 → 12.84 |   1.622 → 1.425 |     1.78 → 1.73 |
| map-ping | local  | json     |      1 |     7.32 → 4.66 |      12.98 → 7.34 |     22.86 → 11.78 |   1.401 → 1.059 |   1.797 → 1.737 |
| map-ping | local  | json     |     50 |     8.11 → 5.89 |      13.51 → 9.87 |     19.37 → 13.71 |   1.359 → 1.202 |   1.679 → 1.712 |
| map-ping | local  | mixed    |      1 |      6.95 → 4.8 |     11.44 → 7.909 |     18.49 → 12.15 |   1.481 → 1.088 |   1.725 → 1.789 |
| map-ping | local  | mixed    |     50 |     7.88 → 5.68 |       12.3 → 9.44 |    17.53 → 12.499 |   1.565 → 1.062 |   1.668 → 1.679 |
| map-ping | remote | msgpack  |      1 |     6.56 → 6.84 |     10.09 → 10.67 |    15.429 → 16.27 |   1.438 → 1.272 |   1.795 → 1.838 |
| map-ping | remote | msgpack  |     50 |     7.52 → 7.76 |      10.29 → 11.7 |      16.7 → 16.76 |   1.628 → 1.169 |    1.723 → 1.82 |
| map-ping | remote | json     |      1 |     4.26 → 4.62 |       6.67 → 7.38 |    12.19 → 15.169 |     1.06 → 1.06 |   1.676 → 1.814 |
| map-ping | remote | json     |     50 |     5.51 → 5.64 |       8.48 → 9.26 |     13.21 → 15.68 |   1.058 → 1.061 |   1.718 → 1.682 |
| map-ping | remote | mixed    |      1 |     4.32 → 4.42 |      7.059 → 7.79 |     12.56 → 15.84 |   1.061 → 1.114 |     1.8 → 1.753 |
| map-ping | remote | mixed    |     50 |      7.8 → 8.78 |     12.75 → 14.15 |    18.209 → 19.26 |   1.597 → 1.783 |   1.897 → 1.985 |

## Interpretation

Across the 18 local event/encoding/fanout scenarios, the median CPU change is -23.0%, with a range from -41.2% to +5.4%. Across remote controls, the median is +1.3% (range -36.6% to +32.5%). These aggregate values weight each synthetic scenario equally; they are not a production traffic-weighted estimate.

Remote control differences and mixed fanout results limit any claim of a universal speedup. Use the individual scenarios when deciding whether the benefit applies to a deployment; profile representative production traffic before changing capacity targets.

The optimization changes no HTTP, Redis federation, RabbitMQ, WebSocket or persistence contract and needs no coordinated rollout. Exceptional local frames retain the existing codec roundtrip; remote frames retain decode, validation and sanitization. Behavioral tests own these compatibility assertions.
