var express = require('express')
const { WebhookClient, Payload} = require("dialogflow-fulfillment")
var randomstring = require("randomstring")
var app = express()
const bodyparser = require('body-parser')
var MongoClient = require('mongodb').MongoClient
const url = 'mongodb://127.0.0.1:27017'
const dbName = "ServiceAssurance"
app.use(bodyparser.urlencoded({extended: true}))
app.use(bodyparser.json())
app.engine('html', require('ejs').renderFile)
app.use(express.static('images'))
app.get('/', (req,res) => {
    res.render('index.html')
})
app.post("/dialogflow", express.json(), (req, res) => {
    const agent = new WebhookClient({ request: req, response: res })
    let intentMap = new Map()
    intentMap.set("Register The Issue", getUsername)
    intentMap.set("Issue Details", issue)
    intentMap.set("Issue", issueRegister)
    intentMap.set("Check Status", checkStatus)
    agent.handleRequest(intentMap)
})
app.listen(1000, () => {
    console.log('Listening at port number 1000')
})
async function getUsername(agent) {
    var accountnumber = agent.parameters.accountnumber
    const client = new MongoClient(url, { useUnifiedTopology: true })
    await client.connect()
    var result = await client.db(dbName).collection('User_details').findOne({"accountnumber": Number.parseInt(accountnumber)})
    if(result == null){
        agent.setFollowupEvent('RegisterTheIssue')
        agent.add('')
    }
    else{
        await agent.add('Hello ' + result.username + ', Enter your complaint.')
    }
}
async function issue(agent) {
    var payLoadData = {
        "richContent": [
            [
                {
                    "type": "list",
                    "title": "Internet Down",
                    "subtitle": "Enter '1' for Internet Down",
                    "event": {
                        "name": "",
                        "languageCode": "",
                        "parameter": {}
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "list",
                    "title": "Slow Internet",
                    "subtitle": "Enter '2' for Slow Internet",
                    "event": {
                        "name": "",
                        "languageCode": "",
                        "parameter": {}
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "list",
                    "title": "Buffering Problem",
                    "subtitle": "Enter '3' for Buffering Problem",
                    "event": {
                        "name": "",
                        "languageCode": "",
                        "parameter": {}
                    }
                },
                {
                    "type": "list",
                    "title": "No Connectivity",
                    "subtitle": "Enter '4' for No Connectivity",
                    "event": {
                        "name": "",
                        "languageCode": "",
                        "parameter": {}
                    }
                }
            ]
        ]
    }
    agent.add(new Payload(agent.UNSPECIFIED, payLoadData, {sendAsMessage: true, rawPayload: true}))
}
async function issueRegister(agent) {
    var choice = Number.parseInt(agent.parameters.choice)
    if(choice >= 1 && choice <= 4){
        var issues = {1: "Internet Down", 2: "Slow Internet", 3: "Buffering problem", 4: "No connectivity"}
        var ticket = randomstring.generate(6)
        const client = new MongoClient(url, { useUnifiedTopology: true })
        await client.connect()
        var result = await client.db(dbName).collection('Issue_details').find({"troubleticket": ticket}).toArray()
        while(result.length != 0){
            ticket = randomstring.generate(6)
            result = await client.db(dbName).collection('Issue_details').find({"troubleticket": ticket}).toArray()
        }
        var accountnumber;
        agent.contexts.forEach(element => {
            if(element.name.endsWith("registertheissue-followup")){
                accountnumber = element.parameters.accountnumber
            }
        })
        var result = await client.db(dbName).collection('Issue_details').insertOne({
            "accountnumber": Number.parseInt(accountnumber),
            "status": "pending",
            "issue": issues[agent.parameters.choice],
            "time": new Date().toLocaleTimeString(),
            "date": new Date().toLocaleDateString(),
            "troubleticket": ticket
        })
        // agent.add("Your complaint has been registered with us. Here is the trouble ticket : " + ticket + ". Keep this ticket for further reference. Your issue will be resolved in 10 - 12 hours.");
        agent.add('Your complaint "' + issues[agent.parameters.choice] + '" has been registered with us. Here is the trouble ticket : ' + ticket + ".")
        agent.add("Keep this ticket for further reference.")
        agent.add("Your issue will be resolved in 10 - 12 hours.")
    }
    else{
        agent.add("Wrong choice. Complaint not registered.")
    }
}
async function checkStatus(agent) {
    const client = new MongoClient(url, { useUnifiedTopology: true })
    await client.connect()
    var result = await client.db(dbName).collection('Issue_details').findOne({"accountnumber": Number.parseInt(agent.parameters.accountnumber),"troubleticket": agent.parameters.troubleticket})
    if(result == null){
        agent.add('Check the details you have entered.')
    }
    else{
        var status = result.status
        if(status == 'pending'){
            // agent.add('Your complaint is ' + status + ". Your issue will be resolved in 5 - 6 hours.")
            agent.add('Your complaint is ' + status + ".")
            agent.add("Your issue will be resolved in 5 - 6 hours.")
        }
        else{
            agent.add('Your complaint is ' + status + ".")
        }
    }
}