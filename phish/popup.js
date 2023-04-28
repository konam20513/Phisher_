document.getElementById('checkLink').addEventListener('click', () => {
  let link = prompt('Enter the link to check: ');
  chrome.runtime.sendMessage({ action: 'checkLink', link }, (response) => {
    document.getElementById('result').innerText = `Link check result: ${response}`; 
  });
});
document.getElementById('summarizeEmail').addEventListener('click', () => {
  //This adds click event listener to the summarizeEmail button.
  chrome.runtime.sendMessage({ action: 'summarizeEmail' }, (response) => {
    //This line sends a message to the background script with action as 'summarizeEmail' and a callback function to handle response
    document.getElementById('result').innerText = `Summarization result: ${response}`;
    //This line sets the innerText of result div to the response received from background script 
  }); 
});




