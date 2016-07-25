var windowsObjectReference = {};

function SodaSandbox() {

    var me = {};
    var contacts = [];
    var userPictures = {};
    var location = null;
    var sessionId = "";
    var conversationId = "";
    var payloads = {};
    var that = this;
    var storage = localStorage;

    function getMyUrl(){
        return window.location.href
    }

    function receiveMessageFromOtherWindow(event)
    {
        // Do we trust the sender of this message?
        if (event.origin !== window.location.origin)
            return;

        windowsObjectReference[event.data] = event.source;
    }

    window.addEventListener("message", receiveMessageFromOtherWindow, false);

    function getURLParameter(name) {
        var where = (window.location.search === "") ? window.location.hash : window.location.search;
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(where)||[,""])[1].replace(/\+/g, '%20'))||null;
    }

    function createUrl(url, newSessionId, newUserId, newConversationId) {
        var result = null;
        if (url && newSessionId && newUserId && newConversationId) {
            //var loc = url.indexOf('sessionId=');
            if (getURLParameter('sessionId')) {
                result = url.replace(/(sessionId=)[^&]+/, '$1' + newSessionId);
            } else {
                if (url.indexOf('?') > -1) {
                    result = url + "&sessionId=" + newSessionId;
                } else {
                    result = url + "?sessionId=" + newSessionId;
                }
            }
            if (getURLParameter('userId')) {
                result = result.replace(/(&userId=)[^&]+/, '$1' + newUserId);
            } else {
                result += "&userId=" + newUserId;
            }
            if (getURLParameter('conversationId')) {
                result = result.replace(/(&conversationId=)[^&]+/, '$1' + newConversationId);
            } else {
                result += "&conversationId=" + newConversationId;
            }
        }
        return result;
    }

    function saveMessage(metadata, isLocal) {
        var jsonData = decryptMsg(metadata);

        function storeUserPayload(userId) {
            var storageItem = decryptMsg(storage.getItem('SODA_ITEM'));
            if (storageItem === null) {
                storageItem = {};
            } else {
                storage.removeItem('SODA_ITEM');
            }
            if (!storageItem.hasOwnProperty(sessionId)){
                storageItem[sessionId] = {};
            }
            storageItem[sessionId][userId] = jsonData.payload;
            storageItem[sessionId]['whoChanged'] = userId;
            storage.setItem("SODA_ITEM", encryptMsg(storageItem));
        }

        if (jsonData !== null && jsonData.sessionId && jsonData.sessionId !== "") {
            sessionId = jsonData.sessionId;
            storage.setItem("SODA_LAST_SESSION", sessionId);

            var url = (typeof jsonData.bubbleAppUrl === "undefined") ? getMyUrl(): decodeURIComponent(jsonData.bubbleAppUrl);

            if (isLocal) {
                payloads[sessionId] = jsonData.payload;
                storeUserPayload(me.userId);
                if (!getURLParameter('sessionId')) {
                    history.pushState("Rewriting URL to add params", "localPage", createUrl(url, sessionId, me.userId, conversationId));
                }

            } else {
                contacts.forEach(function(elem){
                    storeUserPayload(elem.userId);
                    if (!windowsObjectReference.hasOwnProperty(elem.userId) || windowsObjectReference[elem.userId].closed) {
                        /* if the pointer to the window object in memory does not exist
                         or if such pointer exists but the window was closed */
                        var fullUrl = createUrl(url, sessionId, elem.userId, conversationId);
                        windowsObjectReference[elem.userId] = window.open(fullUrl, elem.userId); // The second param will cause it to only open in new tab if it doesn't exist.
                        setTimeout(function() {
                            windowsObjectReference[elem.userId].postMessage(me.userId, fullUrl);
                        }, 3000);
                    }
                });
            }
        }
    }

    addEventListener('storage', storageListenerFunc);

    function storageListenerFunc(event) {
        if (event.key === "SODA_ITEM" && event.newValue) {
            if (typeof setPayload === 'function') {
                var newVal = decryptMsg(event.newValue);
                if (newVal && newVal[sessionId] && newVal[sessionId]['whoChanged'] === me.userId) {
                    setPayload(newVal[sessionId][me.userId]);
                }
            } else {
                console.log('no setPayload function declared');
            }
        }
    }

    function decryptMsg(msg) {
        try {
            return JSON.parse(msg)
        } catch (ex) {
            return null;
        }
    }

    function encryptMsg(msg) {
        try {
            return JSON.stringify(msg)
        } catch (ex) {
            return null;
        }
    }

    function generateUUID() {
        var d = new Date().getTime();
        if (window.performance && typeof window.performance.now === "function") {
            d += performance.now(); //use high-precision timer if available
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function errorMsgGenerator(err) {
        try {
            return JSON.stringify({
                "success": false,
                "result": {
                    "errorId": err
                }
            });
        } catch (e) {
            return '{ \
                "success": false,\
                "result": {\
                "errorId": "bad parameter to function"\
                }\
            }'
        }
    }

    function msgGenerator(content) {
        try {
            return JSON.stringify({
                "success": true,
                "result": content
            });
        } catch (e) {
            return '{ \
                "success": false,\
                "result": {\
                "errorId": "bad parameter to function"\
                }\
            }'
        }

    }

    function getUserPic(userId) {
        if (userPictures.hasOwnProperty(userId)) {
            return userPictures[userId];
        }
        return null;
    }

    //////////////////// PUBLIC METHODS ///////////////////////////////////////

    ////////////// SDK functions start: ///////////////////////////////////////

    this.sendMessage = function(metadata) {
        saveMessage(metadata, false);
    };

    this.sendLocalMessage = function(metadata) {
        saveMessage(metadata, true);
    };

    // All these functions accept another parameter called err,
    // if numeric gte 0, will return an error message of that value.

    this.getLastSession = function(err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        var oldSession;
        if (sessionId === ""){
            oldSession = storage.getItem('SODA_LAST_SESSION');
            if (oldSession){
                return msgGenerator({sessionId : oldSession});
            }
            return errorMsgGenerator(5);
        } else {
            return msgGenerator({sessionId : sessionId});
        }
    };

    this.getUserDetails = function(err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        return msgGenerator(me);
    };

    this.getFriendsDetails = function(err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        return msgGenerator(contacts);
    };

    this.getLastKnownLocation = function(err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        return msgGenerator(location);
    };

    this.getUserPicture = function(userId, err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        var userPic = getUserPic(userId);
        return (userPic === null) ? errorMsgGenerator(5) : msgGenerator(userPic);
    };

    this.getPayload = function(sessionId, err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        var res = {"payload": null};
        if (payloads.hasOwnProperty(sessionId)) {
            res.payload = payloads[sessionId];
        }
        return msgGenerator(res);
    };

    this.getContext = function(err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        return msgGenerator({"context": conversationId});
    };

    this.copyToClipboard = function(err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        return msgGenerator({});
    };

    this.openInExternalBrowser = function(err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        return msgGenerator({});
    };

    this.getProductId = function() {
        return '{"result":{"productId":"123"},"resucarateristicslt":{"productId":"123"}}';
    };

    // Async
    this.getCurrentLocationAsync = function(listener_name, err) {
        if (typeof err === "number" && err >= 0) return errorMsgGenerator(err);
        if (typeof listener_name !== "function") return errorMsgGenerator("callback function not supplied");
        that.setLastLocation(null, listener_name);
    };

    this.closeBubble = function() {
        window.close();
    };

    ////////////// SDK functions end //////////////////////////////////////////

    // Helper functions, not part of SDK:

    // init - Used by SodaSandbox class to initialize it - Don't use.
    this.init = function () {
        var firstUser = "Dima-123";
        var otherUser = "Andrea-123";
        var mockItem = {
            context: generateUUID(),
            members: [{
                userId: firstUser,
                firstName: "Dima",
                lastName: "Nemetz",
                userName: "diman"
            },{
                userId: otherUser,
                firstName: "Andrea",
                lastName: "Alkalay",
                userName: "andrea"
            }],
            userPictures: {}
        };
        mockItem.userPictures[firstUser] = {
            type: "base64",
            picture: "data:image/jpeg;base64,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ueQC42ut2vLDoSOtilBMyx+R97XHS66mUvZYc9d1yu0k6Xv3WpBYbckO3QoEjmuaAbFvq05HdXJwDxr/ABOnZheISXqo2+h7jbO3p7qli5psW6G3NdYaiSlmbNC50cjTcPboQuxk4slZcuAXoY5Kp0ofDVzOlbK3UNJcbtPe6mbT5jGuzA3F9Duq24BxqlkoThVSPS4k+rmSpL+Km4drmQTuL6KU/wAt5/SehK0xao6mSHUEFzbe5WznuvYNvfULLHRzQBwN76gha/h3NF2vPpCkdKm8SMElpK9uJ07C2nqX5Xgfpf8A8/7pJR07G00dN11cOpVtYvhzcVw2akla0iRvpdbZw1BVQYY6VuOT00wyvgeWOHcbqqSpkGhhx6rbUVwgiaWxU7TGB3uS4/P7JlS3EmkYnWdpn/8AkkjRe/sqmVmBobhbuOmoPzWmlud1sed1w6jRZCwsg2N0OHRpAvc8ui3zkkZjoFzbveyCfVlB0vookzqCAL/G46rD7ZQ4Ek227LAcMwFhcdt10DQTlGovbMRogZ0pqt8cjHscQ5vfdX3wL4lVNDHSRYnK+ow6cZWvdq6Fw0IB5jt8l55JyusDdoNwplw3NJU4DiEN7/hy2aM9DzUkjh7BhnjqIWTRPbJG9oc1zTcEHYhKFQvhtxtLhWIR0FbO52HT6DMbiFx2I6Dqr5BBFwbhCJ//2SAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA="

        };
        mockItem.userPictures[otherUser] = {
            type: "image/jpeg",
            picture: "http://lp.startapp.com/BreakTheIce/images/bar.jpeg"
        };

        var paramUserId = getURLParameter('userId');
        var paramContextId = getURLParameter('conversationId');
        if (paramUserId && paramContextId){
            conversationId = paramContextId;
            var allConversations = decryptMsg(storage.getItem("SODA_conversations"));
            mockItem = allConversations[paramContextId];
            var myNewUser = mockItem.members[0];
            var redoMembers = mockItem.members.filter(function(elem){
                if (elem.userId !== paramUserId) {
                    return true;
                } else {
                    myNewUser = elem;
                }
            });
            redoMembers.unshift(myNewUser);
            mockItem.members = redoMembers;
        }
        that.mockContextAndMembers(mockItem);
        var paramSessionId = getURLParameter('sessionId');
        if (paramSessionId){
            var a = decryptMsg(storage.getItem("SODA_ITEM"));
            if (a && a.hasOwnProperty(paramSessionId) && a[paramSessionId].hasOwnProperty(firstUser)) {
                payloads[paramSessionId] = a[paramSessionId][firstUser];
            }
        }
        that.setLastLocation({
            coords: {
                accuracy: 1194,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                latitude: 37.810977,
                longitude: -122.477301,
                speed: null
            },
            timestamp: Date.now()
        });
    };

    // setLastLocation - Use this function with coords of your choice to alter the last location found.
    this.setLastLocation = function (myLocation, cb) {
        if (myLocation) {
            location = myLocation;
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    location = position;
                    if (typeof cb === 'function') cb(position);
                });
            }
        }
    };

    // mockContextAndMembers - Use this function to dictate all meta objects:
    //      ** context - Make it unique
    //      ** members array - containing all the users in the conversation - The first one will be the user of this tab.
    //      ** userPictures object - each key is a userId, each value an object of userPicture: {"picture": ""}.
    this.mockContextAndMembers = function(details) {
        if (details.context && details.members && details.members.length > 1) {
            var context = details.context;
            if (conversationId !== context){
                var allConversations = decryptMsg(storage.getItem("SODA_conversations")) || {};
                if (!allConversations.hasOwnProperty(context)) {
                    allConversations[context] = details;
                    storage.setItem("SODA_conversations", encryptMsg(allConversations));
                }
            }
            conversationId = context;
            me = details.members[0];
            window.name = me.userId;
            details.members.shift();
            contacts = details.members;
            userPictures = details.userPictures;
        }
    };
}

var BubbleAPI = new SodaSandbox();
BubbleAPI.init();

//Export sandbox for package usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubbleAPI;
}