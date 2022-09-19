const express = require('express');
const app = express();
const client = require('prom-client');
const settings = require('./settings.json');
const token = settings.Discord_bot_token;
const {Client, Intents} = require('discord.js');
const e = require('express');
const intents = new Intents(Intents.ALL);
intents.add('GUILD_MEMBERS', 'GUILD_PRESENCES', 'GUILDS');
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
const game_gauge = new client.Gauge({name: "game_activity", help: "game activity of users", labelNames: ["activity", "name"]});

const discordClient = new Client({intents});

discordClient.login(token).catch(console.error);

discordClient.once('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);
});

discordClient.on('ready', () => {
    const list = discordClient.guilds.cache.get(settings.Discord_guild_id);
    list.members.cache.each(member => {
        if (member.presence != null) {
            gauge.labels(member.presence.status, member.user.username).set(1);
            if(member.presence.activities.length > 0) {
                game_gauge.labels({activity: member.presence.activities[0], name: member.user.username}).set(1);
            }
        }
        else{
            resetGauges_to_offline(member.user.username);
        }
    });
    register.registerMetric(gauge);
    register.registerMetric(game_gauge);
//expose metrics
app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
});

discordClient.on('presenceUpdate', async (oldMember, newMember) => {    
    try{
        if(newMember.status != null){
            if(newMember.status != oldMember.status){
            resetGauges(newMember.user.username);
            gauge.labels({status: newMember.status, name: newMember.user.username}).set(1);
            console.log("user " + newMember.user.username + " went from " + oldMember?.status + " to " + newMember.status);
            }
            else if(newMember.activities != ""){
                game_gauge.labels({activity: newMember.activities, name: newMember.user.username}).set(1);
                game_gauge.labels({activity: "Not playing", name: oldMember.user.username}).set(0);
                console.log("user " + newMember.user.username + " started playing " + newMember.activities);
                register.registerMetric(game_gauge);
            }
            else if(oldMember.activities != ""){
                game_gauge.labels({activity: oldMember.activities, name: oldMember.user.username}).set(0);
                game_gauge.labels({activity: "Not playing", name: oldMember.user.username}).set(1);
                console.log("user " + oldMember.user.username + " stopped playing " + oldMember.activities);    
                register.registerMetric(game_gauge);
            }
        }
        register.registerMetric(gauge);
    }
    catch(err){
        if(newMember!= null && newMember.user.username != null){
            resetGauges(newMember.user.username);
            register.registerMetric(gauge);
            console.log("user " + newMember.user.username + " status lost");
        }
        else{
            console.log("name is null");
        }
        console.log(err);
    }
});

//does magic, dont remove
function resetGauges(name){
    gauge.labels("online", name).set(0);
    gauge.labels("offline", name).set(0);
    gauge.labels("idle", name).set(0);
    gauge.labels("dnd", name).set(0);
}

function resetGauges_to_offline(nameas){
    gauge.labels("online", nameas).set(0);
    gauge.labels("offline", nameas).set(1);
    gauge.labels("idle", nameas).set(0);
    gauge.labels("dnd", nameas).set(0);
    game_gauge.labels({activity: "Not playing", name: nameas}).set(1);
}

app.listen(9090, () => console.log('Server is running on http://localhost:9090, metrics are exposed on http://localhost:9090/metrics'))});
