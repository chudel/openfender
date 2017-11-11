# openfender

Openfender is a self-contained HTML and Javascript repository that will take a Quest One Identity Defender Soft Token and produce a QR code so that the One Time Password (OTP) token may be viewable from within the Google Authenticator app, versus the built-in Soft Token application available for Android, iOS, Windows, Java, etc..

Several third-party scripting libraries are requested locally in the HTML for portability and reference. Only JSOTP.js has been modified to correct a bug in that code (please see my fork of that repo for details) so you should feel free to grab your own versions of these same libraries if you like.

### Usage
![Screenshot](/images/screenshot.png?raw=true "Screenshot")
#### Converting Activation Codes
You may 'demo' this capability by entering the word 'android' or 'iphone' as an activation code.  A default activation code will populate in the application and generate an appropriate QR code.
1. Download the contents into a folder and load index.html in your browser.
2. Enter the activation code and press \<enter\>.  
3. A QR code will generate which will be scannable by the Google Authenticator app. 
4. You may modify other aspects of the QR token (issuer, name, etc..) to your liking.  

Note: The app will always append the Defender Soft Token serial number to the issuer field within Google Authenticator.

#### Synchronizing Tokens
If you are converting an activation code for an HOTP-compliant token you *already have in use*, you will need to synchornize the token that the QR code generates with the token you are already using.  This is possible if your current token has not "refreshed" more than 9,999 times [arbitrary limit in the script].  To synchronize your token:
1. Enter the activation code
2. Enter a 6 digit token **from your current Defender Soft Token Display** into the counter field and press \<enter\>
3. If the token can be synchronized (within 10K counters), a new QR code will generate that is in sync with the token the Defender App is displaying.
4. If a token cannot be synchronized, the counter in the display will reset to 1.

Note: You can invalidate your token and fail authentication if you are not careful!  Overly refreshing the Defender Soft Token may cause your token to "drift" out of the permitted token range configured for your application.  **Once you switch to the new Token Display, use only that Token Display** (or sync the tokens back by refreshing the Defender app until the tokens align again).


### Constraints
The following constraints apply in this limitation:
* Defender Soft Tokens are available in a variety of formats (Challenge Response, Grid, etc..) but only HMAC SHA1 (HOTP RFC 4226) compliant soft tokens are supported.  
* The script only handles the presentation of the OTP -- you still need all of the backend Defender infrastructure.
* Some Soft Token Activation Codes have an expiry associated with them. There has been no testing of these types of activation codes.
* Using only publicly available and demo activation codes (Google-Fu), this app has not had much regression testing.
* Error handling is poor, bordering on nonexistent. Check the debug output.
* In some implementations of Google Authenticator (i.e.: Android vs iPhone), the first token that displays is actually the one with "counter=2".  You can workaround this if you must by manually setting the counter to 0 (which will cause Google Authenticator to then display the token with counter=1 which should exactly match the first token that the Defender Soft Token application displays).  Fortunately, there is usually enough "token drift" permitted in HOTP authentication that this should not impact its use.
* May not work well with Internet Explorer.  Firefox or Chrome is recommended.
