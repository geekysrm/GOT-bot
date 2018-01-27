var request = require('request');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var axios = require('axios');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//var asoaif = require('asoiaf-api');

let FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
let FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
let FACEBOOK_SEND_MESSAGE_URL = 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FACEBOOK_PAGE_ACCESS_TOKEN;
let AAOIAF_BASE_URL = 'https://www.anapioficeandfire.com/api/';


app.get('/', function (req, res) {
  res.send("Hello World, I am Hodor-The GOT bot.");
 });

app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === FACEBOOK_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge'])
    return;
  }
  res.send('Error, wrong token')
});

app.post('/webhook/', function (req, res) {
  console.log(JSON.stringify(req.body));
  if (req.body.object === 'page') {
    if (req.body.entry) {
      req.body.entry.forEach(function (entry) {
        if (entry.messaging) {
          entry.messaging.forEach(function (messagingObject) {
            var senderId = messagingObject.sender.id;
            if (messagingObject.message) {
              if (!messagingObject.message.is_echo) {
                var messageText = messagingObject.message.text;
                sendGOTData(senderId, messageText);
              }
            } else if (messagingObject.postback) {
              console.log('Received Postback message from ' + senderId);
            }
          });
        } else {
          console.log('Error: No messaging key found');
        }
      });
    } else {
      console.log('Error: No entry key found');
    }
  } else {
    console.log('Error: Not a page object');
  }
  res.sendStatus(200);
})

function sendUIMessageToUser(senderId, elementList) {
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: elementList
          }
        }
      }
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending UI message to user: ' + error.toString());
    } else if (response.body.error) {
      console.log('Error sending UI message to user: ' + JSON.stringify(response.body.error));
    }
  });
}

function sendMessageToUser(senderId, message) {
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      message: {
        text: message
      }
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending message to user: ' + error);
    } else if (response.body.error) {
      console.log('Error sending message to user: ' + response.body.error);
    }
  });
}

function showTypingIndicatorToUser(senderId, isTyping) {
  var senderAction = isTyping ? 'typing_on' : 'typing_off';
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      sender_action: senderAction
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending typing indicator to user: ' + error);
    } else if (response.body.error) {
      console.log('Error sending typing indicator to user: ' + response.body.error);
    }
  });
}

function sendGOTData(senderId, messageText)
{
  if (messageText.toUpperCase() === "HELP" || messageText.toUpperCase() === "HI" || messageText.toUpperCase() === "HELlO" || messageText.toUpperCase() === "HEY") {
    sendHelpMenu(senderId);
    return;
  }
  if (messageText.toUpperCase() === "BYE" || messageText.toUpperCase() === "GOODBYE") {
    sendBye(senderId);
    return;
  }
 if (messageText.toUpperCase() === "QUOTE") {
    getGOTQuote(senderId);
    return;
  }
  var arr = messageText.split(" ");
  arr[0] = arr[0].toUpperCase();
  if (arr[0] === "WHOIS") {
    var name='';
    for(var i=1;i<arr.length;i++)
    {
      name+=arr[i]+' ';
    }
    getGOTCharacter(senderId, name);
  } else if (arr[0] === "HOUSE") {
    getGOTHouse(senderId, messageText); 
  }  
  else {
    sendMessageToUser(senderId, 'Invalid command. Type "help" to see the list of commands or try again.');
  }
}

function sendHelpMenu(senderId) {
  showTypingIndicatorToUser(senderId, true);
  var message = 'Hodor! You can ask me the following!\n';
  message += '1. whois <GOT Character name> Eg: whois Tyrion Lannister - To know about a character\n';
  message += '2. quote - To get a random GOT quote\n';
  message += '3. house <House name>. Eg: house algood\n';
  message += '4. help. To get this command list :)';
  sendMessageToUser(senderId, message);
}

function sendBye(senderId) {
  showTypingIndicatorToUser(senderId, true);
  var message = 'Bye. Keep coming back...like Jon Snow!';
  sendMessageToUser(senderId, message);
}

function getGOTCharacter(senderId, name){
  showTypingIndicatorToUser(senderId, true);
  var url = AAOIAF_BASE_URL + 'characters/?name=' + name;
  axios.get(url)
    .then(function (response) {
      var msg = response.data[0].name;

      if (response.data[0].aliases.length > 0 || response.data[0].titles.length > 0) {
        msg += ', also known as ';
        var aliases = '';
        for (var i = 0; i < response.data[0].aliases.length; i++) {
          aliases += response.data[0].aliases[i] + ', ';
        }
        msg += aliases;
        var titles = '';
        for (var k = 0; k < response.data[0].titles.length; k++) {
          titles += response.data[0].titles[k] + ', ';
        }
        msg += titles;
      }

      if (response.data[0].culture) {
        msg += 'is of the culture: ' + response.data[0].culture + ' ';
      }

      msg += 'The character is played by ' + response.data[0].playedBy + ' and seen in ';
      for (var j = 0; j < response.data[0].tvSeries.length - 1; j++) {
        msg += response.data[0].tvSeries[j] + ', ';
      }
      msg += response.data[0].tvSeries[response.data[0].tvSeries.length - 1] + ' of Game of Thrones.';
      showTypingIndicatorToUser(senderId, true);
      sendMessageToUser(senderId, msg);
      showTypingIndicatorToUser(senderId, false);
    })
    .catch(error => {
      var errorMsg = 'Could not find any information on this character at the moment. Sorry!';
      showTypingIndicatorToUser(senderId, true);
      sendMessageToUser(senderId, errorMessage);
      showTypingIndicatorToUser(senderId, false);
    });  
}

function getGOTQuote(senderId) {
  showTypingIndicatorToUser(senderId, true);
  var url = 'https://got-quotes.herokuapp.com/quotes';
  axios.get(url)
    .then(function (response) {
      var msg = response.data.quote;
      msg += ' : ' + response.data.character + '.';
      showTypingIndicatorToUser(senderId, true);
      sendMessageToUser(senderId, msg);
      showTypingIndicatorToUser(senderId, false);
    })
    .catch(error => {
      var errorMsg= 'Could not find any quote at the moment. Sorry!';
      showTypingIndicatorToUser(senderId, true);
      sendMessageToUser(senderId, errorMessage);
      showTypingIndicatorToUser(senderId, false);
    }); 
}

function getGOTHouse(senderId, messageText) {
  showTypingIndicatorToUser(senderId, true);
  var url = AAOIAF_BASE_URL + 'characters/?house=' + messageText;
  axios.get(url)
    .then(function (response) {
      msg = response.data[0].name + ' is in the ' + response.data[0].region + ' region. ';

      if (response.data[0].words) {
        msg += 'Its famous quotes are: ' + response.data[0].words +'. ';
      }
      var founder = response.data[0].founder;
      showTypingIndicatorToUser(senderId, true);
      sendMessageToUser(senderId, msg);
      if(founder)
      {
        getFounder(senderId, founder)
      }
      showTypingIndicatorToUser(senderId, false);
    })
    .catch(error => {
      var errorMsg = 'Could not find any information on this house at the moment. Sorry!';
      showTypingIndicatorToUser(senderId, true);
      sendMessageToUser(senderId, errorMessage);
      showTypingIndicatorToUser(senderId, false);
    });  
}

function getFounder(senderId,founder) {
  showTypingIndicatorToUser(senderId, true);
  axios.get(founder)
    .then(function (response) {
      var msg = response.data[0].name + ' is the founder of this house.'
      showTypingIndicatorToUser(senderId, true);
      sendMessageToUser(senderId, msg);
      showTypingIndicatorToUser(senderId, false);
    }); 
}

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});
