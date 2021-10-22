function convert(s) {
    s = s.slice(2);
    // check if first few hex characters are equal to zero
    if(parseInt(s.substr(0, 4), 16) === 0) return `${parseInt(s, 16)}`; // if yes, probably not text
    else return toAscii(s); // else its text!
}

function toAscii(s) {
    let ctr=0, asciiStr='';

    let inRange = c => c >= 32 && c <= 126; // includes alphanumeric, symbols and space

    for(let i=0, c=0; i<s.length; i += 2){
        c = parseInt(s.substr(i, 2), 16) // take 2 hex chars at a time
        if(inRange(c)) ++ctr; // keep track of ascii chars any?
        asciiStr += String.fromCharCode(c);
    }

    if(ctr > 1) return asciiStr; // there are some ascii in it
    return '-NA-'; // else not text based    
}