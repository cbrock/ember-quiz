var quizzes = [
  {
    id: 123,
    createdBy: 'Colin',
    createdOn: new Date(),
    isComplete: false,
    questions: [1, 2]
  },
  {
    id: 2456,
    createdBy: 'Someone else',
    createdOn: new Date(),
    isComplete: false,
    questions: [3, 4, 5]
  }
];

var questions = [
  { id: 1,
    content: 'asdfasdf',
    answers: [
      { id: 1, content: 'I am an answer' },
      { id: 2, content: 'I am an answer too' }
    ],
    correctAnswer: 1
  },
  { id: 2,
    content: 'fdghdfgh',
    answers: [
      { id: 1, content: 'I am an answer for question 2' },
      { id: 2, content: 'I am an answer too' }
    ],
    correctAnswer: 2
  },
  { id: 3,
    content: 'wertwert',
    answers: [
      { id: 1, content: 'I am an answer for question 3' },
      { id: 2, content: 'I am an answer too' }
    ],
    correctAnswer: 2
  },
  { id: 4,
    content: 'sdbnnnvcn',
    answers: [
      { id: 1, content: 'dfghiuef asdfhljsd a ssdf' },
      { id: 2, content: 'I am an answer too' }
    ],
    correctAnswer: 1
  },
  { id: 5,
    content: 'njkhjimbnmhjg',
    answers: [
      { id: 1, content: 'I am an answer' },
      { id: 2, content: 'ssghksdfg erohgadkfhg' }
    ],
    correctAnswer: 1
  }
];

var App = Ember.Application.create({
  ready: function(){
    this.register('session:current', App.Session, {singleton: true});
    this.inject('controller', 'session', 'session:current');
  }
});

// store.js
App.ApplicationAdapter = DS.FixtureAdapter;

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
    console.log('answer saved', questionId, answerId);
  }
});

// quiz.js
App.Quiz = DS.Model.extend({
  name : DS.attr(),
  isComplete : DS.attr(),
  questions : DS.hasMany('question', { async: true } )
});

App.Question = DS.Model.extend({
  content: DS.attr(),
  answers: DS.attr(),
  correctAnswer: DS.attr(),
  question: DS.belongsTo('quiz')
});

App.Quiz.FIXTURES = quizzes;
App.Question.FIXTURES = questions;

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

// usersRoute.js
App.QuizzesRoute = Ember.Route.extend({
  model: function(){
    return this.store.find('quiz');
  }
});

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
      } else {
        console.log('quiz exists in session already', quizExistsInSession);
      }
      this.session.currentQuizId = quizId;
    }
  },
  quizCount: function(){
    return this.get('model.length');
  }.property()
});

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
    }
  }
});

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