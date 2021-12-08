var express = require('express') 
var nodemailer = require('nodemailer');
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
    
    intentMap.set("End Of Conversation", endOfConversation)
    agent.handleRequest(intentMap)
})
app.listen(1000, () => {
    console.log('Listening at port number 1000')
})

var accountnumber;
var result;
async function getUsername(agent) {
    accountnumber = agent.parameters.accountnumber
    const client = new MongoClient(url, { useUnifiedTopology: true })
    await client.connect()
    result = await client.db(dbName).collection('User_details').findOne({"StudentId": Number.parseInt(accountnumber)})
    if(result == null){
        
        agent.add('Invalid id,please enter correct number')
        //agent.setFollowupEvent('RegisterTheIssue')
    }
    else{
        
        await agent.add('Hello ' + result.StudentName + ', how can I help you')
        
    }
}
async function issue(agent) {
    var payLoadData = {
        "richContent": [
            [
                {
                    "type": "list",
                    "title": "Placement",
                    "subtitle": "Enter '1' for Placement",
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
                    "title": "Fee",
                    "subtitle": "Enter '2' for Fee",
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
                    "title": "library",
                    "subtitle": "Enter '3' for library",
                    "event": {
                        "name": "",
                        "languageCode": "",
                        "parameter": {}
                    }
                },
                {
                    "type": "list",
                    "title": "Other",
                    "subtitle": "Enter '4' for Other",
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




var transporter = nodemailer.createTransport({
  host:"smtp.gmail.com",
  port:587,
  secure:false,
  service: 'Gmail',
  auth: {
    user: 'kchandrashekar2662@gmail.com',
    pass: 'k9010912341'
  },
  connectionTimeout: 5*60*1000,
});





async function issueRegister(agent) {
    var choice = Number.parseInt(agent.parameters.choice)
    if(choice >= 1 && choice <= 4){
        var issues = {1: "Placement", 2: "Fee", 3: "library", 4: "Other"}
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
            "StudentId": Number.parseInt(accountnumber),
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


        var mailOptions = {
            from: 'kchandrashekar2662@gmail.com',
            to: 'kongarichandrashekar8@gmail.com',
            subject: 'Your Trouble Ticket',
            text: 'Your trouble ticket id '+ticket.troubleticket+" "+'Issue Type:'+ticket.issue
          };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
    }
    else{
        agent.add("Wrong choice. Complaint not registered.")
    }
}
async function checkStatus(agent) {
    const client = new MongoClient(url, { useUnifiedTopology: true })
    await client.connect()
    var ticket = await client.db(dbName).collection('Issue_details').findOne({"StudentId": result.accountnumber,"troubleticket": agent.parameters.troubleticket})
    
    if(ticket == null){
        agent.add('Sorry please the Check the details you have entered.')
    }
    else{
        var status = ticket.status
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


async function endOfConversation(agent){
    
    if(result == null){
        agent.add('Check the details you have entered.')
    }
    else{
        var name = result.StudentName
        agent.add('Thank you '+name+' have a nice day')
    }
}






