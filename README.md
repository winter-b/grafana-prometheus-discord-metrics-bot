# grafana-prometheus-discord-metrics-bot
 
## Prerequisites

1.Create Discord bot with Adminstrator and presence permmisions

2.Copy and paste bot token to ./monitoring-app/settings.json

3.Install docker

## How to run
Run:
```
docker-compose up
```
from root of the directory or anywhere idgaf i am not your dad

Access exposed metrics at localhost:8080/metrics, prometheus at localhost:9090 and grafana at localhost:3000

## TODO

1. Add example dashboard in grafana

2. Add tracking of user playing activity using Discord presnece

3. Track for how long activity state goes unchanged 

4. Add a cron job to post metrics to a discord channel
