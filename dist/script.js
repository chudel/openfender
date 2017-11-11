/*
The following license applies to this source file only. 
Other files that may be included (from the index.html)
are copyright and licensed by their respective authors.

Copyright (c) 2017 Christopher Hudel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

var debug = true;

$(document).ready(function() {
  $('input').keydown(function(e) {
    if (e.keyCode === 13) {
      onMain();
    }
  });
});

function onMain() {

  // clear Areas
  div = document.getElementById('secondary');
  div.innerText = "Debug Output:\n-------------\n"

  // clear QR Code and other output fields if they exist
  element = document.getElementById("qrcode");
  element.innerHTML = "";

  element = document.getElementById("qrtext");
  element.innerHTML = "";

  element = document.getElementById("tokenInfo");
  element.innerHTML = "";

  var activationKey = $('#acode').val();

  if (activationKey.length < 1) return;
  
  // Set demo values.  These keys were obtained through google searches for demo activation codes
  //
  if (activationKey === 'android') {
    activationKey = "enqwfaqp-laoqaiky-apqznfko-heovmgmw-fotmbhvn-ldopgkzm-ekkummus-ikvnhdll-eoypbhrt-cilnmcly-epskpolo-mfqmepmv";
    $('#acode').val(activationKey);
  } else if (activationKey === 'iphone') {
    activationKey = "bisnblun-cixzforu-gkmndbyz-fdqmbhwk-nfmzfinu-bmxskems-fixuodvm-fhknljxr-ljqlbfrp-kiomlnpz-bdxsjgws-gomxolkt"
    $('#acode').val(activationKey);
  }

  var bytes = new Uint8Array(256);

  var round1 = "";
  var round2 = "";
  var step3 = "";
  var step4 = "";
  var final = "";

  const regex = /^[a-z\-]+$/g; // must match only lowercase alphabet and hyphen
  if (regex.test(activationKey)) {
    var activationKeyLength = decodeActivationKey(activationKey, bytes);
    log("activationKeyLength: " + activationKeyLength);
    if (activationKeyLength != 48)
      log("\n***\n*** WARNING: Only tested with decoded key length of 48. \n*** This may not be a valid key or one that can be decoded.\n***\n");
    log("decoded value: " + toHexString(bytes).substring(0, activationKeyLength * 2));

    // Load the first decryption
    var key = chars_from_hex("bd65d462c74c1ebb");
    var msg = chars_from_hex(toHexString(bytes).substr(0, 16));
    round1 += stringToHex(des(key, msg, 0));
    log("--[ Round: 1 Iter: 0 ]--");
    log("       key: " + stringToHex(key));
    log("ciphertext: " + stringToHex(msg));
    log(" plaintext: " + stringToHex(des(key, msg, 0)));

    for (i = 16; i < activationKeyLength * 2; i += 16) {
      log("--[ Round: 1 Iter: " + i / 16 + " ]--");
      msg = chars_from_hex(toHexString(bytes).substr(i, 16));
      key = chars_from_hex(toHexString(bytes).substr(i - 16, 16));
      round1 += stringToHex(des(key, msg, 0));
      log("       key: " + stringToHex(key));
      log("ciphertext: " + stringToHex(msg));
      log(" plaintext: " + stringToHex(des(key, msg, 0)));
    }

    var step2 = hexToString(round1);
    step3 = xor(step2, 0xaa);
    log("\nXOR with '0xaa': \n" + stringToHex(step3) + "\n");

    // Load the second decryption
    key = chars_from_hex("75c8bb3821bbc00b");
    msg = chars_from_hex(stringToHex(step3).substr(0, 16));
    step4 += stringToHex(des(key, msg, 0));

    log("--[ Round: 2 Iter: 0 ]--");
    log("       key: " + stringToHex(key));
    log("ciphertext: " + stringToHex(msg));
    log(" plaintext: " + (step4));

    for (i = 16; i < activationKeyLength * 2; i += 16) {
      log("--[ Round: 2 Iter: " + i / 16 + " ]--");
      key = chars_from_hex(stringToHex(step3).substr(i - 16, 16));
      msg = chars_from_hex(stringToHex(step3).substr(i, 16));
      step4 += stringToHex(des(key, msg, 0));
      log("       key: " + stringToHex(key));
      log("ciphertext: " + stringToHex(msg));
      log(" plaintext: " + stringToHex(des(key, msg, 0)));
    }

    // last bitwise xor
    var step5 = hexToString(step4);
    final = xor(step5, 0x55);

    log("\nXOR with '0x55': (final value)\n" + stringToHex(final) + "\n");
  } else {
    log("Invalid Activation Key Format");
    return;
  }
  tinfo ("Decrypted token info (hex): " + stringToHex(final));
  // The secret is 32 bytes long, but the 9-11th bytes are removed from
  // the 'final' buffer. i.e.: buffer[08], buffer[09], buffer[10])
  //
  secretloc = final.substring(0, 8) + final.substring(11, 35);
  // Convert secret to base32, removing '=' padding characters that don't load on iOS devices

  log("Secret: " + stringToHex(secretloc));
  tinfo ("<br>Secret (hex): " + stringToHex(secretloc));
  
  var secret = base32.encode(secretloc,'asciionly').split('=').join('');
  tinfo ("<br>Secret (Base32): " + secret);
  // Check/Set Counter. If Counter is a Token code (six digits), search the first
  // 10,000 counters to see if there is a likely token to sync/match to.
  //
  counter = parseInt($('#counter').val());
  if (isNaN(counter)) counter = 1;
  $('#counter').val(counter);

  var hotp = new jsOTP.hotp(6);
  var saved = 0;

  if ($('#counter').val().length == 6)
  {
    cname = $('#counter').val();
    log("counter is six digits; Assuming counter is a token code to sync to");
    log("The first 10,000 counters will be checked and the first match will be used");

    for (tick=0;tick<10000;tick++)
    {
      if ( hotp.getOtp(stringToHex(secretloc),tick) == cname)
      {
        log("Possible Counter Value found at:" + tick);
        if (saved == 0 )
        { saved = tick;
        tinfo ("<br>Token Sync @ Counter: " + tick);
        }
      }
    }
    if (!saved) {
      log("No matching token found iin 10,000 attempts. Resetting to one");
      counter = 1;
    } 
    else counter = saved;
    $('#counter').val(counter);
  }

// Based on limited data, believe that the token Platform is in byte position:
//    5th from the last byte in the decrypted data (last byte is checksum)
//
// Token Serial Number is Little Endian encoded and the last 4 bytes (not including checksum byte)
//
  finalLength = stringToHex(final).length;
  tokenPlatform = stringToHex(final).substring(finalLength-6*2,finalLength-5*2);
  tokenPlatformText = "<br>Token Originally for: ";
  switch (tokenPlatform)
  {
    case "00": tokenPlatformText += "Windows";break;
    case "02": tokenPlatformText += "Blackberry"; break;
    case "03": tokenPlatformText += "Windows CE/Mobile"; break;
    case "04": tokenPlatformText += "iOS"; break;
    case "07": tokenPlatformText += "Android"; break;
    case "0a": tokenPlatformText += "Java"; break;
    default: tokenPlatformText += "UNKNOWN PLATFORM";
  }
  tinfo (tokenPlatformText);
  
  tokenSerial = parseInt("0x" + (stringToHex(final).substring(finalLength-5*2,finalLength-1*2).match(/../g).reverse().join('')));
  tinfo("<br>Token serial #: " + tokenSerial);
  
  tinfo ("<hr/>");

  tinfo("<h3>Counter value: " + counter + "</h3>");
  tinfo("<h3>Token value: " + hotp.getOtp(stringToHex(secretloc),counter) + "</h3>");


  // Make the HOTP string
  var hotpurl = "otpauth://hotp/" + $('#tname').val() +
    "?secret=" + secret +
    "&issuer=" + $('#issuer').val() + "-" + tokenSerial + 
    "&counter=" + counter;

  log("HOTP URL: " + hotpurl);

  // Now make the QR Code
  var qrcode = new QRCode(document.getElementById("qrcode"), {
    width: 200,
    height: 200
  });

  qrcode.makeCode(hotpurl);
  element = document.getElementById("qrtext");
  element.innerHTML = hotpurl;

  hmacCode = hotp.getOtp(stringToHex(secretloc),counter);
  log(hmacCode);

}

// Function Definitions
function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

function xor(source, xorValue) {
  var dest = "";
  for (i = 0; i < source.length; i++)
    dest += String.fromCharCode(source[i].charCodeAt(0) ^ xorValue);
  return dest;
}

// from view-source:https://etherhack.co.uk/symmetric/des_3des/des_3des.html
function hex_from_chars(inputstr) {
  var delimiter = '';
  var outputstr = '';
  var hex = "0123456789abcdef";
  hex = hex.split('');
  var n;
  var inputarr = inputstr.split('');
  for (var i = 0; i < inputarr.length; i++) {
    if (i > 0) outputstr += delimiter;
    if (!delimiter && i % 32 === 0 && i > 0) outputstr += '\n';
    n = inputstr.charCodeAt(i);
    outputstr += hex[(n >> 4) & 0xf] + hex[n & 0xf];
  }
  return outputstr;
}

// from view-source:https://etherhack.co.uk/symmetric/des_3des/des_3des.html
function chars_from_hex(inputstr) {
  var outputstr = '';
  inputstr = inputstr.replace(/^(0x)?/g, '');
  inputstr = inputstr.replace(/[^A-Fa-f0-9]/g, '');
  inputstr = inputstr.split('');
  for (var i = 0; i < inputstr.length; i += 2) {
    outputstr += String.fromCharCode(parseInt(inputstr[i] + '' + inputstr[i + 1], 16));
  }
  return outputstr;
}

//function log
function log(s) {
  if (debug) {
    var div = document.getElementById('secondary');
    div.innerText += s + "\n"
  }
}

// write to tokenInfo
function tinfo(s)
{
  var div = document.getElementById('tokenInfo');
  div.innerHTML += s;
}

// Function deCodeActivationKey
function decodeActivationKey(key, buffer) {
  var printableChars = "abcdefghijklmnopqrstuvwxyz";
  var i = 0;
  var k = key.length;
  for (j = 0; i < k - 1; i++, j++) {
    if (key.charAt(i) == '-') {
      j--;
    } else {
      offset = ((j % 2 === 0 ? 0 : 10));
      l = printableChars.indexOf(key.toLowerCase().charAt(i), 0);
      buffer[j] = (l - offset << 4) & 0xF0;
      i++;

      m = printableChars.indexOf(key.toLowerCase().charAt(i), 0);
      buffer[j] |= (m - offset) & 0x0F;
      test = (m-offset) & 0x0F;
    }
  }
  return j;
}
