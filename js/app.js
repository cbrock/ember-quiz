/**
* Mock data
*/
var quizzes = [
  {
    id: 123,
    questions: [1, 2]
  },
  {
    id: 2456,
    questions: [3, 4, 5]
  }
];

var questions = [
  { id: 1,
    content: 'Who is the best super hero?',
    answers: [
      { id: 1, content: 'Punisher' },
      { id: 2, content: 'Wolverine' }
    ],
    correctAnswer: 1
  },
  { id: 2,
    content: 'What color is the sky?',
    answers: [
      { id: 1, content: 'Green' },
      { id: 2, content: 'Blue' }
    ],
    correctAnswer: 2
  },
  { id: 3,
    content: 'What is 2 + 2?',
    answers: [
      { id: 1, content: '3' },
      { id: 2, content: '4' }
    ],
    correctAnswer: 2
  },
  { id: 4,
    content: 'What is 5 + 5',
    answers: [
      { id: 1, content: '10' },
      { id: 2, content: '25' }
    ],
    correctAnswer: 1
  },
  { id: 5,
    content: 'Is Ember fun to work with?',
    answers: [
      { id: 1, content: 'Yes' },
      { id: 2, content: 'No' }
    ],
    correctAnswer: 1
  }
];

/**
* App init
*/

var App = Ember.Application.create({
  ready: function(){
    this.register('session:current', App.Session, {singleton: true});
    this.inject('controller', 'session', 'session:current');
  }
});

App.ApplicationAdapter = DS.FixtureAdapter;

/**
* Models
*/

// session.js
App.Session = Ember.Object.extend({
  currentQuizId: null,
  getCurrentQuiz: function(){
    var currentQuizId = this.currentQuizId;
    var quiz = this.quizHistory.find(function(quiz){
          return +quiz.id === currentQuizId;
    });
    return quiz;
  },
  currentQuizIsComplete: function(){
    if(this.getCurrentQuiz()){
      return this.getCurrentQuiz().isComplete;
    }
    return false;
  },
  quizHistory: [],
  saveAnswer: function(questionId, answerId){
    var quiz = this.getCurrentQuiz();
    quiz.answers.set(questionId, answerId);
    alert('Answer saved.');
    console.log('answer saved', questionId, answerId);
  }
});

// quiz.js
App.Quiz = DS.Model.extend({
  name : DS.attr(),
  questions : DS.hasMany('question', { async: true } )
});

// question.js
App.Question = DS.Model.extend({
  content: DS.attr(),
  answers: DS.attr(),
  correctAnswer: DS.attr(),
  question: DS.belongsTo('quiz')
});

App.Quiz.FIXTURES = quizzes;
App.Question.FIXTURES = questions;

/**
* Routes
*/

// router.js
App.Router.map(function(){
  this.resource('quizzes', function(){
    this.resource('quiz', { path:'/:quiz_id' }, function(){
      this.resource('question', { path:'question/:question_id' });
      this.resource('summary', { path:'summary' });
    });
  });
});

// indexRoute.js
App.IndexRoute = Ember.Route.extend({
  redirect: function(){
    this.transitionTo('quizzes');
  }
});

// quizzesRoute.js
App.QuizzesRoute = Ember.Route.extend({
  model: function(){
    return this.store.find('quiz');
  }
});

/**
* Controllers
*/

// quizzesController.js
App.QuizzesController = Ember.ArrayController.extend({
  actions: {
    quizStart: function(quiz){
      var quizId = +quiz.get('id');
      
      var quizExistsInSession = this.session.quizHistory.find(function(quizSession){
        return quizSession.id === quizId;
      });
      
      if(! quizExistsInSession){
        console.log('new quiz start', quiz.get('id'));
        var newQuiz = {
          id: quizId,
          answers: Ember.Map.create(), // QuestionId:AnswerId map
          isComplete: false
        };
        this.session.quizHistory.push(newQuiz);
      }

      this.session.currentQuizId = quizId;
    }
  },
  quizCount: function(){
    return this.get('model.length');
  }.property()
});

// questionController.js
App.QuestionController = Ember.ObjectController.extend({
  actions: {
    getNextQuestion: function(currentQuestion){
      var currentQuestionIndex = this.store.all('question').indexOf( currentQuestion );
      var nextQuestion = this.store.all('question').objectAt( currentQuestionIndex + 1 );

      if(nextQuestion){
        this.transitionToRoute('question', nextQuestion.get('id'));
      } else {
        var submitQuiz = confirm('No more questions. Do you want to submit your quiz?');
        
        if(submitQuiz){
          this.session.getCurrentQuiz().isComplete = true;
          this.transitionToRoute('summary');
        }
      }
    },
    answer: function(selectedAnswer){
      var questionId = this.get('model').get('id');
      this.session.saveAnswer(questionId, selectedAnswer.id);
      this.set('selectedAnswer', true);
    }
  }
});

// summaryController.js
App.SummaryController = Ember.ObjectController.extend({
  quizScore: function(){
    var currentQuizSession = this.session.getCurrentQuiz();

    /**
    * TODO: fix bug here. If coming into app from /summary route, the `quizScore` property computation is triggered and won't display the correct answer percentage upon quiz completion
    */
    if(this.session.quizHistory.indexOf(currentQuizSession) === -1){
      this.transitionToRoute('/');
      return;
    }
    
    var correctAnswers = [];
    this.store.all('question').forEach(function(question){
      var questionId = question.get('id');
      var userAnswer = currentQuizSession.answers.get(questionId);
      if(question.get('correctAnswer') === userAnswer){
        correctAnswers.push(userAnswer);
      }
    });

    return correctAnswers.length / this.store.all('question').get('length') * 100;
  }.property()
});