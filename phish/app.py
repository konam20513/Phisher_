#Load the required libraries
from heapq import nlargest
from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
from spacy.lang.en.stop_words import STOP_WORDS
import json
import torch
from transformers import RobertaTokenizer, RobertaForSequenceClassification
import requests 
import re


#Initialize the flask app
app = Flask(__name__)

#Enable CORS
#(app, origins='chrome-extension://ekdkdcknogcieleaaalbcljgacmpnemk', supports_credentials=True, methods=['POST', 'GET'])
CORS(app,origins=['http://localhost','chrome-extension://ekdkdcknogcieleaaalbcljgacmpnemk', 'https://akhilo0o.pythonanywhere.com'], supports_credentials=True, methods=['POST', 'GET'])


#Load the list of stopwords and spacy model                                                    
stopwords = list(STOP_WORDS)
nlp = spacy.load('en_core_web_sm')

#Function to get links from text
def get_links(text):
    links = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)
    return links
    
#Function to get final link by following redirects
def get_final_link(url):
    try:
        r = requests.head(url, allow_redirects=True, timeout=5)
        final_url = r.url
    except requests.exceptions.Timeout:
        final_url = url
    return final_url
    
#Function to get email summary  
def get_summarySpacy(article, summary_length=0.3):
    from string import punctuation
    #Create a spacy document
    doc = nlp(article)
    #Get punctuation
    punctuation += '/n'
    #Get word frequences
    word_freq = {}

    # Finding word frequency
    for word in doc:
        if word.text.lower() not in stopwords:
            if word.text.lower() not in punctuation:
                if word.text not in word_freq.keys():
                    word_freq[word.text] = 1
                else:
                    word_freq[word.text] += 1
    #Get maximum frequncy
    max_freq = max(word_freq.values())

    # Finding weighted frequencies of occurrence
    for word in word_freq.keys():
        word_freq[word] = word_freq[word] / max_freq
    #Extract sentences
    sentence_tokens = [sentence for sentence in doc.sents]
    sent_scores = {}

    # Calculate sentence scores
    for sent in sentence_tokens:
        for word in sent:
            if word.text.lower() in word_freq.keys():
                if sent not in sent_scores.keys():
                    sent_scores[sent] = word_freq[word.text.lower()]
                else:
                    sent_scores[sent] += word_freq[word.text.lower()]

    # Summary
    select_len = int(len(sentence_tokens) * summary_length)
    summary = nlargest(select_len, sent_scores, key=sent_scores.get)
    return summary[0]

#Home route
@app.route('/')
def index():
    return "Deploy 25"

#Route to get email summary
@app.route('/summarizeEmail', methods=['GET', 'POST'])
def summarize():
    #Get request data
    data = request.get_data()
    email_content = json.loads(data)  # Decode JSON data
    #Get summary length
    summary_length = email_content.get('summary_length', 0.3)
    #Check if email content exists
    if not email_content:
        return jsonify({'error': 'Invalid email content'}), 400
    #Get summary
    summary = get_summarySpacy(email_content, summary_length)
    return jsonify({'summary': summary})


@app.route('/checkLink', methods=['GET', 'POST']) 
def check_link():
    data = request.get_data()
    link = json.loads(data)['link']  # Extract link from request data
    

    API_URL = "https://api-inference.huggingface.co/models/Akhil0-o/saved_model_body"
    headers = {"Authorization": "Bearer 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"}

    def query(payload):
        response = requests.post(API_URL, headers=headers, json=payload)
        return response.json()
    
    
        
    output = query({
        "inputs": link,
    })
    result = output['result']
    label1_score = result[0][1]['score']
    label0_score = result[0][0]['score']
    if label1_score > label0_score:
        return jsonify({'result': 'Malicious link'})
    else:
        return jsonify({'result': 'Not a malicious link'})


#Add CORS headers to response
@app.after_request
def after_request(response):
  response.headers.add('Access-Control-Allow-Origin', 'chrome-extension://ekdkdcknogcieleaaalbcljgacmpnemk')  
  response.headers.add('Content-Type', 'application/json')
  return response
  
#Run the flask app
if __name__ == '__main__':
    app.run(debug=True)