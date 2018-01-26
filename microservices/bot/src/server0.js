//fb-exchange bot
var request = require('request');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

XMLHttpRequest.UNSENT = 0;
XMLHttpRequest.OPENED = 1;
XMLHttpRequest.HEADERS_RECEIVED = 2;
XMLHttpRequest.LOADING = 3;
XMLHttpRequest.DONE = 4;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
let FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
let FACEBOOK_SEND_MESSAGE_URL = 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FACEBOOK_PAGE_ACCESS_TOKEN;

app.get('/', function (req, res) {
    res.send("Hey there! You have reached the Bot's very own home. To see it in action, head over to https://www.messenger.com/t/exchangeRateBot now!");
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
                                //Assuming that everything sent to this bot is a movie name.
                                var senderText = messagingObject.message.text;
                                //getMovieDetails(senderId, movieName);
                                processText(senderId, senderText);
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
});

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

function processText(senderId, messageText) {
    if (messageText.toUpperCase() === "HELP") {
        showTypingIndicatorToUser(senderId, true);
        sendHelpMenu(senderId);
        return;
    }
    var arr = messageText.split(" ");
    arr[0] = arr[0].toUpperCase();
    if (arr[0] === "CRYPTO") {
        cryptoRateInfo(senderId, arr); //https://www.cryptocompare.com/api/
    } else if (arr[0] === "CURR") {
        currRateInfo(senderId, arr); //https://api.fixer.io/
    } else if (arr[0] === "CTRCODE") {
        getCountryCode(senderId, arr); //https://restcountries.eu/
    } else if (arr[0] === "CRYCODE") {
        getCryptoCode(senderId, arr);	//Hasura Data API
    } /*else if(arr[0] === "add") {
		 console.log('Add function called '+messageText);
		 addCryptoDetails(senderId, arr);
	 } */else {
        sendMessageToUser(senderId, 'Invalid command. Type help to see the list of commands or try again.');
    }
}

function sendHelpMenu(senderId) {
    showTypingIndicatorToUser(senderId, false);
    var message = 'Functions currently supported:\n';
    message += '1. crypto <Cryptocurrency_Code> <Conversion_Currency_Code>. Eg: crypto BTC INR or crypto ETH BCH\n';
    message += '2. curr <From_Currency_Code> <To_Currency_Code>. Eg: curr INR USD\n';
    message += '3. ctrcode <Country _Name>. Eg: ctrcode India\n';
    message += '4. crycode <Cryptocurrency name>. Eg. crycode ripple\n';
    message += '5. help. To get this list of course ;)';
    sendMessageToUser(senderId, message);
}

function cryptoRateInfo(senderId, arr) {
    showTypingIndicatorToUser(senderId, true);
    if (arr[1] === undefined || arr[2] === undefined) {
        sendMessageToUser(senderId, "Invalid format of request. Please type help to get the correct form of request.");
        return;
    }
    arr[1] = arr[1].toUpperCase();
    arr[2] = arr[2].toUpperCase();
    var message = 'The price of ';
    var url = 'https://min-api.cryptocompare.com/data/pricemultifull?fsyms=' + arr[1] + '&tsyms=' + arr[2];

    var priceReq = new XMLHttpRequest();
    priceReq.onreadystatechange = function () {
        if (priceReq.readyState === XMLHttpRequest.DONE) {
            showTypingIndicatorToUser(senderId, false);
            if (priceReq.status === 200) {
                var response = JSON.parse(priceReq.responseText);
                if (response['DISPLAY'] === undefined) {
                    sendMessageToUser(senderId, 'Invalid currency codes entered. Please try again with the right codes.');
                    return;
                }
                var fromSym = response['DISPLAY'][arr[1]][arr[2]].FROMSYMBOL;
                var toPrice = response['DISPLAY'][arr[1]][arr[2]].PRICE;
                message += '1' + fromSym + ' = ' + toPrice;
                sendMessageToUser(senderId, message);
            } else {
                sendMessageToUser(senderId, "Some error occurred processing your request. Please recheck the command or try again later.");
            }
        }
    }
    priceReq.open('GET', url, true);
    priceReq.send();
}

function getCountryCode(senderId, arr) {
    showTypingIndicatorToUser(senderId, true);
    if (arr[1] === undefined) {
        sendMessageToUser(senderId, "Invalid format of request. Please type help to get the correct form of request.");
        return;
    }
    var message = 'The currency symbol of ';
    var url = 'https://restcountries.eu/rest/v2/name/';
    for (var i = 1; i < arr.length - 1; i++) {
        url += arr[i] + ' ';
        message += arr[i] + ' ';
    }
    url += arr[arr.length - 1] + '?fullText=true';
    message += arr[arr.length - 1] + ' is: ';

    var priceReq = new XMLHttpRequest();
    priceReq.onreadystatechange = function () {
        if (priceReq.readyState === XMLHttpRequest.DONE) {
            showTypingIndicatorToUser(senderId, false);
            if (priceReq.status === 200) {
                var response = JSON.parse(priceReq.responseText);
                var cCode = response[0].currencies[0].code;
                message += cCode + '.';
                sendMessageToUser(senderId, message);
            } else if (priceReq.status === 404) {
                sendMessageToUser(senderId, "Your input did not match any known country name. Please recheck the name and try again.");
                console.log(priceReq.status + " Response " + priceReq.responseText);
            } else {
                sendMessageToUser(senderId, "Some error occurred processing your request. Please recheck the command or try again later.");
            }
        }
    }
    priceReq.open('GET', url, true);
    priceReq.send();
}

/*function addCryptoDetails(senderId, arr) {
	var addRequest= new XMLHttpRequest();
	addRequest.onreadystatechange= function(){
		if (addRequest.readyState === XMLHttpRequest.DONE){
			if(addRequest.status=== 200){
				var data = JSON.parse(addRequest.responseText).Data;
				var jsonData = JSON.stringify(data);
				var sendText = '{"type": "bulk","args": [{"type": "insert","args": {"table": "crypto_code","objects": [';
				JSON.parse(jsonData, (key, value) => {
					if(key !== "Id" && key !== "Url" && key !== "ImageUrl" && key !== "Name" && key !== "Symbol" && key !== "CoinName" && key !== "FullName" && key !== "Algorithm" && key !== "ProofType" && key !== "FullyPremined" && key !== "TotalCoinSupply" && key !== "PreMinedValue" && key !== "TotalCoinsFreeFloat" && key !== "SortOrder" && key !== "Sponsored" && key !== "Data" && key !== "") {
						sendText += '{"currency_name": "'+data[key].CoinName+'","currency_code": "'+data[key].Symbol+'"},';
					}
				});
				sendText += '{"currency_name": "delete_this","currency_code": "BUL"}]}}]}';
				var addDetails= new XMLHttpRequest();
				addDetails.onreadystatechange= function(){
					if (addDetails.readyState === XMLHttpRequest.DONE){
						if(addDetails.status=== 200){
							sendMessageToUser(senderId, 'Added all to database');
						} else{
							sendMessageToUser(senderId, 'Some Error Occurred.');
						}
					}
				}
				//make the request
				addDetails.open('POST', 'https://data.furnished70.hasura-app.io/v1/query', true);
				addDetails.setRequestHeader('Content-Type', 'application/json');
				addDetails.setRequestHeader('Authorization', 'Bearer <ADMIN_TOKEN_HERE>');
				addDetails.send(sendText);
			}
			else{
				console.log(addDetails.status+" Response "+addDetails.responseText);
			}
		}
	}
	//make the request
	addRequest.open('GET', 'https://min-api.cryptocompare.com/data/all/coinlist', true);
	addRequest.send();
}*/

function getCryptoCode(senderId, arr) {
    showTypingIndicatorToUser(senderId, true);
    if (arr[1] === undefined) {
        sendMessageToUser(senderId, "Invalid format of request. Please type help to get the correct form of request.");
        return;
    }
    var currName = arr[1];
    for (var i = 2; i < arr.length; i++) {
        currName += ' ' + arr[i];
    }
    var message = 'The symbol of ' + currName + ' is: ';

    var getCode = new XMLHttpRequest();
    getCode.onreadystatechange = function () {
        if (getCode.readyState === XMLHttpRequest.DONE) {
            if (getCode.status === 200) {
                showTypingIndicatorToUser(senderId, false);
                var response = JSON.parse(getCode.responseText);
                message += response[0].currency_code + '.';
                sendMessageToUser(senderId, message);
            } else {
                sendMessageToUser("Could not find the cryptocurrency you are looking for. Please check your command and try again.");
            }
        }
    }
    //make the request
    getCode.open('POST', 'https://data.furnished70.hasura-app.io/v1/query', true);
    getCode.setRequestHeader('Content-Type', 'application/json');
    getCode.send(JSON.stringify({
        type: "select",
        args: {
            table: "crypto_code",
            columns: ["currency_code"],
            where: {
                currency_name: {
                    $ilike: currName
                }
            }
        }
    }));

}

function currRateInfo(senderId, arr) {
    showTypingIndicatorToUser(senderId, true);
    if (arr[1] === undefined || arr[2] === undefined) {
        showTypingIndicatorToUser(senderId, false);
        sendMessageToUser(senderId, "Invalid format of request. Please type help to get the correct form of request.");
        return;
    }
    arr[1] = arr[1].toUpperCase();
    arr[2] = arr[2].toUpperCase();
    var message = 'The price of ';
    var url = 'https://api.fixer.io/latest?base=' + arr[1] + '&symbols=' + arr[2];

    var priceReq = new XMLHttpRequest();
    priceReq.onreadystatechange = function () {
        if (priceReq.readyState === XMLHttpRequest.DONE) {
            showTypingIndicatorToUser(senderId, false);
            if (priceReq.status === 200) {
                var response = JSON.parse(priceReq.responseText);
                var toPrice = response['rates'][arr[2]];
                message += '1 ' + arr[1] + ' = ' + toPrice + ' ' + arr[2];
                sendMessageToUser(senderId, message);
            } else {
                sendMessageToUser(senderId, "Some error occurred processing your request. Please recheck the command or try again later.");
            }
        }
    }
    priceReq.open('GET', url, true);
    priceReq.send();
}

app.listen(8080, function () {
    console.log('Exchange Rate Bot app listening on port 8080!');
});