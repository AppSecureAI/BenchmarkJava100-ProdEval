/*! Test suite JavaScript util functions */

$(document).ready(function() {
    // Add listeners for Jersey Ajax w/XML forms (and possibly others)
    if (!!document.getElementById("login-btn")) {
        document.getElementById("login-btn").addEventListener('click', dispatchToSubmit);
    }
    if (!!document.getElementById("login-btn-atk")) {
        document.getElementById("login-btn-atk").addEventListener('click', dispatchToSubmit);
    }
    if (!!document.getElementById("cGenerator")) {
        document.getElementById("cGenerator").addEventListener('click', setCookie);
    }
});

function dispatchToSubmit(event) {
    const id = event.target.id;
    const button = document.getElementById(id);
    const methodName = button.getAttribute('method');
    const testcase = button.getAttribute('testcase');
    switch (methodName) {
        case 'submitHeaderForm':
          submitHeaderForm(testcase);
          break;
        case 'submitHeaderNamesForm':
          submitHeaderNamesForm(testcase);
          break;
        case 'submitParameterNamesForm':
          submitParameterNamesForm(testcase);
          break;
        case 'submitJSONwAjax':
          submitJSONwAjax(testcase);
          break;
        case 'submitXMLwAjax':
          submitXMLwAjax(testcase);
          break;
        default:
          console.log("dispatchToSubmit() received unexpected method name: " + methodName);
    }
}

// Generate custom cookie in browser for testing purposes
function setCookie(event) {
    const id = event.target.id;
    const button = document.getElementById(id);
    const testcase = button.getAttribute('testcase');
    const cvalue = document.getElementById(testcase + 'A').value;

    const formVar = "#Form" + testcase;
    var URL = $(formVar).attr("action");

    Cookies.set(testcase, cvalue, {
        path: URL, version: 1, secure: true
    });
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\])/g, "\$1");
}

// Safely render content in a sandboxed iframe for XSS demonstration
function renderInSandboxedFrame(content, targetSelector) {
    const target = $(targetSelector);
    target.empty();

    // Create sandboxed iframe for isolated XSS demonstration
    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-same-origin'; // Minimal permissions - no scripts execution in parent context
    iframe.style.width = '100%';
    iframe.style.minHeight = '200px';
    iframe.style.border = '1px solid #ddd';
    iframe.style.backgroundColor = '#f9f9f9';

    target.append(iframe);

    // Write content to sandboxed iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write('<html><head><style>body { font-family: monospace; white-space: pre-wrap; word-wrap: break-word; padding: 10px; }</style></head><body>');
    iframeDoc.write(content);
    iframeDoc.write('</body></html>');
    iframeDoc.close();
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function submitHeaderForm(testcase) {
    const formVar = "#Form" + testcase;
    const suffix = "-Unsafe";
    var rawtestcase = testcase;
    if (testcase.endsWith(suffix)) rawtestcase = testcase.substring(0, testcase.length - suffix.length);
    var formData = $(formVar).serialize();
    var URL = $(formVar).attr("action");
    var text = $(formVar + " input[id=" + rawtestcase + "]").val();

    var xhr = new XMLHttpRequest();
    xhr.open("POST", URL, true);

    xhr.setRequestHeader( rawtestcase, text );

    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            if (URL.includes("xss")) {
                renderInSandboxedFrame(stripHTML(xhr.responseText), "#code");
           } else { $("#code").text(decodeEscapeSequence(stripHTML(xhr.responseText))); }
        } else {
            $("#code").text("Error " + xhr.status + " " + xhr.statusText + " occurred.");
        }
    }
    xhr.send(formData);
}

function submitHeaderNamesForm(testcase) {
    const formVar = "#Form" + testcase;
    const suffix = "-Unsafe";
    var rawtestcase = testcase;
    if (testcase.endsWith(suffix)) rawtestcase = testcase.substring(0, testcase.length - suffix.length);
    var formData = $(formVar).serialize();
    var URL = $(formVar).attr("action");
    var text = $(formVar + " input[id=" + rawtestcase + "]").val();

    var xhr = new XMLHttpRequest();
    xhr.open("POST", URL, true);

    xhr.setRequestHeader( text, rawtestcase );

    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            $("#code").text(decodeEscapeSequence(stripHTML(xhr.responseText)));
        } else {
            $("#code").text("Error " + xhr.status + " " + xhr.statusText + " occurred.");
        }
    }
    xhr.send(formData);
}

function submitParameterNamesForm(testcase) {
    const formVar = "#Form" + testcase;
    const suffix = "-Unsafe";
    var rawtestcase = testcase;
    if (testcase.endsWith(suffix)) rawtestcase = testcase.substring(0, testcase.length - suffix.length);
    var text = $(formVar + " input[id=" + rawtestcase + "]").val();

    // This block not in submitFormAttack() - why?
    $("input.headerClass").remove(); // Remove and recreate
    $("<input type='hidden' value='" + rawtestcase + "' />")
     .attr("id", text) // What happens if the ID attribute doesn't exist for 'attacks'
     .attr("name", text)
     .addClass("headerClass")
     .appendTo(formVar);

    var formData = $(formVar).serialize();
    var URL = $(formVar).attr("action");

    var xhr = new XMLHttpRequest();
    xhr.open("POST", URL, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            if (URL.includes("xss")) {
                renderInSandboxedFrame(xhr.responseText, "#code");
           } else { $("#code").text(decodeEscapeSequence(xhr.responseText)); }
        } else {
            $("#code").text("Error " + xhr.status + " " + xhr.statusText + " occurred.");
        }
    }
    xhr.send(formData);
}

function decodeEscapeSequence(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

// Strip off the HTML preamble of AJAX Response (if any) and replace <br>s with real carriage returns
function stripHTML(xmlResponse) {
    // Crude: Rips out XML content we don't want to display in the browser'
    // Remove everything up through and including <p> plus carriage return after
    var result = xmlResponse;
    var pIndex = xmlResponse.indexOf('<p>');
    if (pIndex > 0) {
        result = xmlResponse.substring(pIndex + 4, xmlResponse.length);
    }
    result = result.replaceAll("<br>", "
"); // Replace all <br>'s with carriage returns'

    return result;
}

// XML Ajax Method
function submitXMLwAjax(testcase) {
    const formVar = "#Form" + testcase;
    var URL = $(formVar).attr("action");
    var dataF = "<person>";
    $(formVar + " input[type=text]").each(function() {
            dataF += "<"+this.name+"><![CDATA[";
            dataF += this.value;
            dataF += "]]></"+this.name+">";
        });
    dataF += "</person>";

    $.ajax({
        type: "POST",
        url: URL,
        contentType: "application/xml; charset=utf-8",
        data: dataF,
        dataType: "xml",
         success: function(data, textStatus, xhr) {
            $("#code").text(getXMLMsgValues(xhr.responseText));
        },
        error: function (xhr, textStatus, errorThrown){ alert(errorThrown); }
    });
};

function getXMLMsgValues(xmlResponse) {
    // Crude: Rips out XML content we don't want to display in the browser'
    var result = xmlResponse.replaceAll('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', "");
    result = result.replaceAll("<xMLMessages>","").replaceAll("</xMLMessages>","").replaceAll("<message><msg>","");
    result = result.replaceAll("</msg></message>","
");

    return result;
}

// JSON Methods
 (function ($) {
    $.fn.serializeFormJSON = function () {

        var o = {};
        var a = this.serializeArray();
        $.each(a, function () {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };
})(jQuery);

function submitJSONwAjax(testcase) {

    const formVar = "#Form" + testcase;    
    var dataF = $(formVar).serializeFormJSON();
    var URL = $(formVar).attr("action");

    $.ajax({
      type: "POST",
      url: URL,
      data: JSON.stringify(dataF),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
     success: function(data, textStatus, xhr){
          $("#code").text(getJsonMsgValues(xhr.responseText));
        },
    error: function (xhr, textStatus, errorThrown){ alert(errorThrown);}
    });
};

function getJsonMsgValues(jsonResponse) {
    var result = "";
    JSON.parse(jsonResponse).forEach(function (msg) {
        const prefix = '{"msg":"';
        var msgString = JSON.stringify(msg); // e.g., {"msg":"Here is the standard output of the command:"}
        // FIXME: This is a hack. There has to be a better/more native way in JavaScript
        msgString = msgString.substring(prefix.length, msgString.length - 2).replaceAll("
", "
");
        result += msgString + "
";
    });
    
    return result;
}
