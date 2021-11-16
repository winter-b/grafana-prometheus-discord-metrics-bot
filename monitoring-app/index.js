const express = require('express');
const app = express();
const client = require('prom-client');
const settings = require('./settings.json');
const token = settings.Discord_bot_token;
const {Client, Intents} = require('discord.js');
const intents = new Intents(32767);
const register = new client.Registry();

client.collectDefaultMetrics({register});

const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in microseconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
  })

register.registerMetric(httpRequestDurationMicroseconds)

register.setDefaultLabels({
    app: 'monitoring-app'
  })

const gauge = new client.Gauge({name: "activity", help: "activity of users", labelNames: ["status", "name"]});

const discordClient = new Client({intents});
discordClient.login(token);
discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);
});

//expose metrics
app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
});

discordClient.on('presenceUpdate', async (oldMember, newMember) => {    
    try{
        resetGauges(newMember.user.username);
        if(newMember.status != null){
            gauge.labels({status: newMember.status, name: newMember.user.username}).inc();
            console.log("user " + newMember.user.username + " went form " + oldMember?.status + " to " + newMember.status);
        }
        register.registerMetric(gauge);
    }
    catch(err){
        if(newMember!= null && newMember.user.username != null){
            resetGauges(newMember.user.username);
            register.registerMetric(gauge);
            cosole.log("user " + newMember.user.username + " status lost");
        }
        else{
            console.log("name is null");
        }
        console.log(err);
    }
});

function resetGauges(name){
    gauge.labels("online", name).set(0);
    gauge.labels("offline", name).set(0);
    gauge.labels("idle", name).set(0);
    gauge.labels("dnd", name).set(0);
}

app.listen(8080, () => console.log('Server is running on http://localhost:8080, metrics are exposed on http://localhost:8080/metrics'));
