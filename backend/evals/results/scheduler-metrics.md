# Scheduler evaluation

Generated 2026-11-09T07:01:37.989Z · 300 random workloads per scenario · 0 hard-rule violations

## light (5 tasks)

| Algorithm | Missed feasible deadlines ↓ | Critical tasks placed % ↑ | Priority-weighted value % ↑ | High-priority placed % ↑ | Deep work in morning % ↑ | Violations |
|---|---|---|---|---|---|---|
| schedula | 0.05 | 94.3 | 89.1 | 93.9 | 83.5 | 0 |
| edf | 0.13 | 91.5 | 87.8 | 91.3 | 75.5 | 0 |
| priority | 0.27 | 82.9 | 89.0 | 98.1 | 77.2 | 0 |
| fifo | 0.36 | 77.2 | 84.9 | 89.0 | 76.7 | 0 |
| random | 0.36 | 76.4 | 85.9 | 86.8 | 73.9 | 0 |

Schedula vs EDF: 32W/261T/7L · vs priority-only: 63W/229T/8L

## typical (10 tasks)

| Algorithm | Missed feasible deadlines ↓ | Critical tasks placed % ↑ | Priority-weighted value % ↑ | High-priority placed % ↑ | Deep work in morning % ↑ | Violations |
|---|---|---|---|---|---|---|
| schedula | 0.60 | 83.5 | 51.9 | 76.1 | 59.1 | 0 |
| edf | 0.86 | 78.1 | 48.6 | 58.7 | 60.0 | 0 |
| priority | 1.55 | 56.8 | 56.9 | 93.0 | 58.3 | 0 |
| fifo | 1.89 | 46.8 | 47.5 | 60.1 | 58.5 | 0 |
| random | 1.93 | 45.9 | 48.5 | 56.6 | 61.4 | 0 |

Schedula vs EDF: 170W/98T/32L · vs priority-only: 213W/60T/27L

## heavy (20 tasks)

| Algorithm | Missed feasible deadlines ↓ | Critical tasks placed % ↑ | Priority-weighted value % ↑ | High-priority placed % ↑ | Deep work in morning % ↑ | Violations |
|---|---|---|---|---|---|---|
| schedula | 3.16 | 55.8 | 20.3 | 41.0 | 55.4 | 0 |
| edf | 3.54 | 50.9 | 18.7 | 25.5 | 57.2 | 0 |
| priority | 4.87 | 32.0 | 26.0 | 76.0 | 54.5 | 0 |
| fifo | 5.55 | 22.4 | 18.7 | 27.1 | 55.7 | 0 |
| random | 5.70 | 20.4 | 18.5 | 25.3 | 54.2 | 0 |

Schedula vs EDF: 203W/44T/53L · vs priority-only: 251W/22T/27L

## overloaded (40 tasks)

| Algorithm | Missed feasible deadlines ↓ | Critical tasks placed % ↑ | Priority-weighted value % ↑ | High-priority placed % ↑ | Deep work in morning % ↑ | Violations |
|---|---|---|---|---|---|---|
| schedula | 10.93 | 24.3 | 5.4 | 14.1 | 45.0 | 0 |
| edf | 11.35 | 21.6 | 5.3 | 10.7 | 54.1 | 0 |
| priority | 12.57 | 13.0 | 7.9 | 39.9 | 49.2 | 0 |
| fifo | 13.30 | 8.0 | 5.3 | 10.5 | 53.9 | 0 |
| random | 13.36 | 7.5 | 5.3 | 10.1 | 52.4 | 0 |

Schedula vs EDF: 181W/57T/62L · vs priority-only: 225W/34T/41L

## mid-afternoon start (12 tasks, now=13:20)

| Algorithm | Missed feasible deadlines ↓ | Critical tasks placed % ↑ | Priority-weighted value % ↑ | High-priority placed % ↑ | Deep work in morning % ↑ | Violations |
|---|---|---|---|---|---|---|
| schedula | 2.65 | 36.3 | 12.8 | 28.2 | 0.0 | 0 |
| edf | 2.75 | 34.4 | 11.9 | 21.2 | 0.0 | 0 |
| priority | 3.23 | 23.2 | 16.0 | 53.3 | 0.0 | 0 |
| fifo | 3.63 | 14.8 | 12.1 | 20.0 | 0.0 | 0 |
| random | 3.61 | 15.2 | 11.9 | 20.5 | 0.0 | 0 |

Schedula vs EDF: 99W/165T/36L · vs priority-only: 140W/123T/37L

## Determinism

- identical on re-run: 200/200
- identical when input shuffled: 200/200

## Explainability

- slots: 683; explanation present: 683; scores match: 683; time matches: 683

## Performance

| Tasks | Median ms | p95 ms |
|---|---|---|
| 10 | 2.56 | 8.03 |
| 100 | 20.68 | 26.98 |
| 500 | 101.11 | 106.4 |
| 1000 | 207.17 | 210.57 |
| 5000 | 1021.02 | 1062.16 |
