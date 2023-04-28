// Get access token  
let accessToken;

//Function to get access token from chrome identity API
async function getAccessToken() {
  accessToken = await new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({
      interactive: true,
      //Request for Gmail API scopes
      scopes: ['https://www.googleapis.com/auth/gmail.readonly']
    }, token => {
      //If error in getting access token
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        //Set access token and resolve promise
        accessToken = token;
        resolve(token);
      }
    });
  });  
}


async function query(data) {
	const response = await fetch(
		"https://api-inference.huggingface.co/models/Akhil0-o/saved_model_body",
		{
			headers: { Authorization: "Bearer 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" },
			method: "POST",
			body: JSON.stringify(data),
		}
	);
	const result = await response.json();
	return result;
}

function getMails() {
  var x = [];
  [].forEach.call(document.querySelectorAll("tr > td:nth-child(6)"), function (z) {
    x.push(z.innerText);
  });
  x.shift();
  return x;
}


async function useModel(mails) {
  console.log(mails);
  let label_0 = 0;
  let label_1 = 0;
  let total = 0;
  for (let i = 0; i < 10; i++) {
    total++;
    const response = await query(mails[i]);
    console.log(i, response[0]);
    if(response[0][0].score > response[0][1].score){
      label_1++;
    } else {
      label_0++;
    }
  }
  return "Out of recent " + total + " mails, " + label_1 + " mails are not malicious and " + label_0 + " mails are malicious";
}


// Function to get current open email in Gmail
async function getCurrentViewedEmail() {
  await getAccessToken();
  let message;
  //Fetch currently open email from Gmail API
  await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/list?labelIds=INBOX&maxResults=1&access_token=' + accessToken)
  .then(res => res.json())
  .then(data => {
    // check if email exists
    if (data.messages && data.messages.length > 0) {
      //Get email ID
      const messageId = data.messages[0].id;
      return fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?access_token=${accessToken}`)
    }
  })
  //Get email content
  .then(res => res.json())
  .then(data => {
    //Set email content
    message = data;  
  });
  if (!message) {
    //If no email exists
    throw new Error('No emails found in the current view');
  } 
  //return email content
  return message; 
}

async function checkLink(link, sendResponse) {
    try {
      const response = await fetch('http://akhilo0o.pythonanywhere.com/checkLink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link }),
      });
      const result = await response.json();
      console.log(result);
      sendResponse(result);  
    } 
    catch (err) {
      console.log(err);
      sendResponse(err); 
    } 
}


//Function to summarize email using deployed flask app
async function summarizeEmail(sendResponse) {
    try {
        const message = await getCurrentViewedEmail();
        if (!message) {
          throw new Error('No email found in the current view');
        }
        const emailContent = message.payload.parts[0].body.data;
        const response = await fetch('http://akhilo0o.pythonanywhere.com/checkPhishing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailContent }),
        });
        const result = await response.json();
        sendResponse(result);
    } 
    catch (err) {
        console.log('Fetching from API...');
        console.log(err);
        sendResponse(err);
    }
}


//Listen to messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkLink') {
    /*const headers = {
      //Set headers
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'chrome-extension://ekdkdcknogcieleaaalbcljgacmpnemk',
      'Access-Control-Allow-Headers': 'Content-Type'
    };*/
    const link = request.link;
    checkLink(link, result => {
      sendResponse(JSON.stringify(result));
    });
    return true;
  }
  if (request.action === 'summarizeEmail') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var activeTab = tabs[0];
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: getMails
      }, async (value) => {
        const response = await useModel(value[0].result);
        sendResponse(JSON.stringify(response));
      });
    });
    return true;
  }
  
  
});





