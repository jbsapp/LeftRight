/**
 * Created by Jonathan on 18/07/2016.
 */

(function() {
    'use strict';

    var QUESTION_TYPE_TEXT = 1;
    var QUESTION_TYPE_IMG = 2;
    var QUESTION_TYPE_TEXT_AND_IMAGE = 3;

    
    var ANSWER_TYPE_SIMPLE = 0;
    var ANSWER_TYPE_TEXT = 1;
    var ANSWER_TYPE_IMG = 2;
    var ANSWER_TYPE_TEXT_AND_IMAGE = 3;


    //noinspection JSUnresolvedFunction
    var myApp = angular.module('leftright', ['ui.router', 'ui.bootstrap']);

    myApp.config(uiRouterConfig);
    myApp.controller("mainController", mainController);
    myApp.filter('orderObjectBy', function(){
        return function(input, attribute) {
            if (!angular.isObject(input)) return input;

            var array = [];
            for(var objectKey in input) {
                array.push(input[objectKey]);
            }

            array.sort(function(a, b){
                a = parseInt(a[attribute]);
                b = parseInt(b[attribute]);
                return a - b;
            });
            return array;
        }
    });
    //myApp.factory("dataService", dataService);
    //dataService.$inject = ['$http'];
    //myApp.directive('backImg', backImgDirective);


 
    function mainController($scope, $state, $http) { //dataService

        $scope.close_page = function () {
            BubbleAPI.closeBubble();
        };

        $scope.startgame = function () {
            $state.go('game', []);
        };



    }

    function scoreController($scope, $state, $stateParams, $http) { //dataService





        var SUBMIT_SCORE_URL = "http://localhost:8089/LeaderBoardServer/leaderboard/submitscore"

        $scope.close_page = function () {
            BubbleAPI.closeBubble();
        };

        $scope.startgame = function () {
            $state.go('game', []);
        };

        $scope.fromgame = $stateParams.fromgame;
        $scope.lastscore = $stateParams.lastscore;
        $scope.failreason = $stateParams.failreason;
        
        $scope.scores = [];

        
        $scope.isFromGame = function () {
            return $scope.fromgame;
        };

        var config = {
            headers : {
                'Content-Type': 'application/json; charset=UTF-8',
                'Accept': 'application/json'
            }
        };
        function getUserDetails(){
            try {
                var userData = window.BubbleAPI.getUserDetails();
                return JSON.parse(userData);
            }
            catch(err) {
                console.log(err);
            }
        }  
        $scope.thisUser = getUserDetails().result;
        

        $scope.bubbleId = "leftright_ext_id";
        $scope.productId = JSON.parse(window.BubbleAPI.getProductId()).result.productId;
        $scope.contextId = JSON.parse(window.BubbleAPI.getContext()).result.context;
        $scope.userId = $scope.thisUser.userId;
        $scope.userName = $scope.thisUser.userName;
        $scope.score = $scope.lastscore;
        $scope.ascending = true;

        $scope.submitResource = {"bubbleId": $scope.bubbleId ,
                                "productId":  $scope.productId,
                                "contextId":$scope.contextId,
                                "userId": $scope.userId ,
                                "userName": $scope.userName ,
                                "score": $scope.score ,
                                "ascending": $scope.ascending}
        $scope.submitReturn = "";

        function compare(a,b) {
            if (a.score < b.score)
                return 1;
            if (a.score > b.score)
                return -1;
            return 0;
        }
        $scope.submit = function () {
            if($scope.fromgame){
                $http.post(SUBMIT_SCORE_URL, $scope.submitResource, config)
                    .success(function (data, status, headers, config) {
                        console.log("Good");

                        $scope.scores = data.scores.sort(compare);


                    })
                    .error(function (data, status, header, config) {
                        console.log("bad");

                    });
            }
        };



        $scope.submit();
    }

    

    // function dataService ($http) {
    //     var self = this;
    //     self.oldTerm = "";
    //
    //     return {
    //         getVideos: function (term) {
    //             var localLeaderboard = "http://localhost:8089/LeaderBoardServer/leaderboard/getboard";
    //             //var baseUrlVideos = "https://www.googleapis.com/youtube/v3/videos?part=snippet&maxResults=8&type=video&chart=mostPopular&key=AIzaSyC3uyCBDDrBbLfxSww1if11aruTathocLA";
    //
    //             if (term === ""){
    //                 return $http.get(baseUrlVideos);
    //             }
    //             var sanitizedTerm = encodeURIComponent(term);
    //             return $http.get(baseUrlSearch + "&q=" + sanitizedTerm);
    //         },
    //         setOldTerm: function (term) {
    //             self.oldTerm = term;
    //         },
    //         getOldTerm: function () {
    //             return self.oldTerm;
    //         },
    //         sendMessage: function (data) {
    //
    //             function generateUUID() {
    //                 var uuid;
    //                 var d = new Date().getTime();
    //                 //noinspection JSUnresolvedVariable
    //                 if (window.performance && typeof window.performance.now === "function") {
    //                     //noinspection JSUnresolvedVariable
    //                     d += performance.now(); //use high-precision timer if available
    //                 }
    //                 //noinspection SpellCheckingInspection
    //                 uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    //                     var r = (d + Math.random() * 16) % 16 | 0;
    //                     d = Math.floor(d / 16);
    //                     return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    //                 });
    //                 return uuid;
    //             }
    //
    //             var metadata = {
    //                 "sessionId": generateUUID(),
    //                 "updateMsg": false,
    //                 "payload": "",
    //                 "iconUrl" : data.imageUrl,
    //                 "title" : data.title,
    //                 "priority": 2,
    //                 "text": data.channelId,
    //                 "actionType": "PLAY",
    //                 "bubbleAppUrl": encodeURIComponent(location.origin + location.pathname + "#/video/" + data.videoId + "?linked=true")
    //             };
    //             // "iconUrl" : window.location.origin + window.location.pathname.replace('index.html', '') + "images/youtube_message_icon.png",
    //
    //             var jsonData = JSON.stringify(metadata);
    //             BubbleAPI.sendMessage(jsonData);
    //             BubbleAPI.sendLocalMessage(jsonData);
    //             BubbleAPI.closeBubble();
    //         }
    //     };
    // }

    function uiRouterConfig($stateProvider, $urlRouterProvider) {
        // For any unmatched url, redirect to /
        $urlRouterProvider.otherwise("main");

        // Now set up the states
        $stateProvider
            .state('main', {
                url: "/main",
                templateUrl: "partials/main_page.html",
                params: {
                    fromgame: false,
                    lastscore: 0,
                    failreason: ""
                },
                controller: scoreController,
                resolve: {
                    $uibModalInstance: function () {
                        return null;
                    }
                }
            })
            .state('game', {
                url: "/game", // linked is optional
                templateUrl: "partials/game_page.html",
                params: {
                    videoId: null,
                    title: null,
                    channelId: null,
                    imageUrl: null
                },
                controller: GameController,
                resolve: {
                    $uibModalInstance: function () {
                        return null;
                    },
                    videoDetails: function () {
                        return null;
                    }
                }
            });
    }

    function GameController($scope, $stateParams, $state, $interval, $sce, $uibModalInstance, videoDetails, $timeout) { //dataService


        $scope.hasStarted = false;

        $scope.usedQuestionsIdsRank3 = [];
        $scope.usedQuestionsIdsRank4 = [];


        $scope.questionsRank1 = questionsRank1;
        $scope.questionsRank2 = questionsRank2;
        $scope.questionsRank3 = questionsRank3;
        $scope.questionsRank4 = questionsRank4;


        $scope.currentQuestion = [];
        $scope.currentScore = 0;

        $scope.winText = "";

        $scope.canClick = true;

        $scope.currentTime = 20;
        $scope.currentTimeStr = "20";
        var intervalPromise = $interval(callAtInterval, 100);
        $scope.$on('$destroy', function () { $interval.cancel(intervalPromise); });
        function callAtInterval() {

            if($scope.hasStarted){
                $scope.currentTime = roundToTwo(($scope.currentTime - 0.1));
                $scope.currentTimeStr = numToStr($scope.currentTime);

                if($scope.currentTime <= 0){
                    showWrongAnimationAndExit(2);
                }
            }

        }

        function roundToTwo(num) {

            return parseFloat(Math.round(num * 100) / 100);
        }
        function numToStr(num) {

            return num.toFixed(1);
        }




        function getQuestionRank1() {
            var i = getRandomInt(0, $scope.questionsRank1.length - 1);
            return $scope.questionsRank1[i];
        }
        function getQuestionRank2() {
            var i = getRandomInt(0, $scope.questionsRank2.length - 1);
            return $scope.questionsRank2[i];
        }
        function getQuestionRank3Unused() {
            
            //if used all question then clear array of used questions
            if($scope.usedQuestionsIdsRank3.length == $scope.questionsRank3.length){
                $scope.usedQuestionsIdsRank3 = [];
            }
            
            var i = getRandomInt(0, $scope.questionsRank3.length - 1);
            if(!wasQuestionRank3UsedAlready($scope.questionsRank3[i].qId)){
                return $scope.questionsRank3[i];
            }else{
                getQuestionRank3Unused();
            }
        }

        function getQuestionRank4Unused() {

            //if used all question then clear array of used questions
            if($scope.usedQuestionsIdsRank4.length == $scope.questionsRank4.length){
                $scope.usedQuestionsIdsRank4 = [];
            }

            var i = getRandomInt(0, $scope.questionsRank4.length - 1);
            if(!wasQuestionRank4UsedAlready($scope.questionsRank4[i].qId)){
                return $scope.questionsRank4[i];
            }else{
                getQuestionRank4Unused();
            }
        }
        

        function setNewQuestion() {

            if($scope.currentScore < 7){
                
                $scope.currentQuestion = getQuestionRank1();
            }
            else if($scope.currentScore < 20){
                
                var r = getRandomInt(0, 100);
                if(r < 50){
                    $scope.currentQuestion = getQuestionRank1();
                }else{
                    $scope.currentQuestion = getQuestionRank2();
                }
            }
            else if($scope.currentScore < 50){
                
                var r = getRandomInt(0, 100);
                if(r < 30){
                    $scope.currentQuestion = getQuestionRank1();
                }else if(r < 70){
                    $scope.currentQuestion = getQuestionRank2();
                }else{
                    $scope.currentQuestion = getQuestionRank3Unused();
                }
            }
            else{

                var r = getRandomInt(0, 100);
                if(r < 40){
                    $scope.currentQuestion = getQuestionRank1();
                }else if(r < 60){
                    $scope.currentQuestion = getQuestionRank2();
                }else if(r < 80){
                    $scope.currentQuestion = getQuestionRank3Unused();
                }else{
                    $scope.currentQuestion = getQuestionRank4Unused();
                }
            }

            $scope.canClick = true;
        }


        function wasQuestionRank3UsedAlready(qId){
            var a = $scope.usedQuestionsIdsRank3.indexOf(qId);
            return(a > -1);
        }
        function wasQuestionRank4UsedAlready(qId){
            var a = $scope.usedQuestionsIdsRank4.indexOf(qId);
            return(a > -1);
        }

        $scope.isImageQuestion = function(){
            return $scope.currentQuestion.questionType == QUESTION_TYPE_IMG;
        }
        $scope.isTextQuestion = function(){
            return $scope.currentQuestion.questionType == QUESTION_TYPE_TEXT;
        }
        $scope.isTextAndImageQuestion = function(){
            return $scope.currentQuestion.questionType == QUESTION_TYPE_TEXT_AND_IMAGE;
        }


        


        $scope.isSimpleAnswer = function(){
            return $scope.currentQuestion.answerType == ANSWER_TYPE_SIMPLE;
        }
        $scope.isTextAnswer = function(){
            return $scope.currentQuestion.answerType == ANSWER_TYPE_TEXT;
        }
        $scope.isImageAnswer = function(){
            return $scope.currentQuestion.answerType == ANSWER_TYPE_IMG;
        }
        $scope.isTextAndImageAnswer = function(){
            return $scope.currentQuestion.answerType == ANSWER_TYPE_TEXT_AND_IMAGE;
        }
        $scope.firstOrder = function(){
            return $scope.currentQuestion.qOrder == 1;
        }
        $scope.secondOrder = function(){
            return $scope.currentQuestion.qOrder == 2;
        }
        
        

        $scope.catchClick = function(j){
            if(!$scope.hasStarted){
                $scope.hasStarted = true;
            }

            if($scope.canClick){
                $scope.canClick = false;
                if(isCorrect(j)){
                    correct();
                    showCorrectAnimationAndAdvance();
                }else{
                    showWrongAnimationAndExit(1);
                }
            }else{
                //some response?
            }


        }

        function isCorrect(j) {
            if($scope.currentQuestion.answer == j){
                return true;
            }else{
                return false;
            }
        }



        function showCorrectAnimationAndAdvance() {

            //some animation
            if($scope.winText == "Good"){
                $scope.winText = "Nice";    
            }else{
                $scope.winText = "Good";
            }
            
            
            setNewQuestion()
        }
        function showWrongAnimationAndExit(j) {

            //some animation
            
            var failReason = 0;
            
            if(j == 1){
                failReason = "Wrong answer..."
            }else if(j == 2){
                failReason = "Time's up..."
                
            }
            $state.go('main', {"fromgame" : true,
                                "lastscore" : $scope.currentScore,
                                "failreason" : failReason});
            



        }

        

        function correct() {

            $scope.currentScore = $scope.currentScore + 1; 

            var t = $scope.currentTime + $scope.currentQuestion.questionReward;
            $scope.currentTime = roundToTwo(t);
            $scope.currentTimeStr = numToStr($scope.currentTime);


        }
        

        $scope.score = 0;
        $scope.loadingVideo = true;





        // $scope.send = function(event) {
        //     if (!$scope.linked) {
        //         dataService.sendMessage({
        //             'videoId': $stateParams.videoId,
        //             'title': $stateParams.title,
        //             'channelId': $stateParams.channelId,
        //             'imageUrl': $stateParams.imageUrl
        //         });
        //     }
        //     event.stopPropagation();
        // };
 

        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        
        function start() {
            setNewQuestion();
        }
        start();
    }

})();
