define([
	'jquery', 'ProjectView', 'util'
],
function ($, ProjectView, util) {
	
describe("omega", function () {

	var name = {};
	var messageInput = {};
	var form = {};
	var messagesElement = {
		get: function () { return window; }
	};
	var socket = {
		on: function () {},
		emit: function () {}
	};

	var tracker;

	beforeEach(function () {
		tracker = new ProjectView(name, messageInput, form, messagesElement, socket);
		tracker.userManager.current("norris");
		tracker.userManager.loggedIn(true);
	});
	
	describe("message list", function () {
		it("shows history upon connection", function () {
			var omegaEvents = [
				{ type: { name: 'openIssue' }, message: "test1" },
				{ type: { name: 'updateIssue' }, message: "test2" },
				{ type: { name: 'assignIssue' }, message: "test3" }
			];
			
			tracker.messageList.processHistory(omegaEvents);
			expect(tracker.messageList.messages().length).toBe(3);
			expect(tracker.messageList.messages()[0].message).toEqual("test1");
		});
		
		it("shows consistent history by overwriting existing messages", function () {
			tracker.messageList.messages([{msg: 'foo'}, {msg: 'bar'}]);
			var omegaEvents = [
				{ type: { name: 'openIssue' }, message: "test1" },
				{ type: { name: 'updateIssue' }, message: "test2" },
				{ type: { name: 'assignIssue' }, message: "test3" }
			];
			
			tracker.messageList.processHistory(omegaEvents);
			expect(tracker.messageList.messages().length).toBe(3);
			expect(tracker.messageList.messages()[0].message).toEqual("test1");
		});

		it("adds flavour when appropriate", function () {
			var closeEvent = { type: { name: 'closeIssue' }, message: "bob closed 3." };
			var assignEvent = { type: { name: 'assignIssue' }, message: "bob assigned 3 to jim." };
			tracker.messageList.append(closeEvent);
			tracker.messageList.append(assignEvent);

			var closeMessage = tracker.messageList.messages()[0].message;
			expect(closeMessage.length).toBeGreaterThan(closeEvent.message.length);

			var assignMessage = tracker.messageList.messages()[1].message;
			expect(assignMessage.length).toEqual(assignEvent.message.length);
		});
	});

	describe("handles login", function () {
		it("accepts valid names", function () {
			name.val = function () { return "norris"; };
			tracker.userManager.current(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalled();
			expect(socket.emit.mostRecentCall.args[0]).toBe('login user');
			expect(socket.emit.mostRecentCall.args[1]).toBe('norris');
		});
		it("rejects empty name", function () {
			name.val = function () { return ""; };
			tracker.userManager.current(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).wasNotCalled();
			expect(tracker.userManager.invalidName()).toBe(true);
		});
		it("rejects short names", function () {
			name.val = function () { return "yo"; };
			tracker.userManager.current(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).wasNotCalled();
			expect(tracker.userManager.invalidName()).toBe(true);
		});
		it("rejects reserved names", function () {
			name.val = function () { return "nobody"; };
			tracker.userManager.current(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalled();
			var callback = socket.emit.mostRecentCall.args[2];
			expect(tracker.userManager.invalidName()).toBe(false);
			callback(true); // server says invalid
			expect(tracker.userManager.invalidName()).toBe(true);
		});
	});
	
	describe("displays html links", function () {
		it("for basic urls", function () {
			var text = "http://www.foo.com";
			expect(util.addHtmlLinks(text)).toEqual('<a href="http://www.foo.com">http://www.foo.com</a>');
		});
		it("for urls in parens", function () {
			var text = "at foo (http://www.foo.com) I'm telling you";
			expect(util.addHtmlLinks(text)).toEqual('at foo (<a href="http://www.foo.com">http://www.foo.com</a>) I\'m telling you');
		});
		it("for urls with a query string etc.", function () {
			var text = "at http://foo.com?id=bar#asdf";
			expect(util.addHtmlLinks(text)).toEqual('at <a href="http://foo.com?id=bar#asdf">http://foo.com?id=bar#asdf</a>');
		});
		it("for https", function () {
			var text = "at https://foo.com/?id=bar#asdf";
			expect(util.addHtmlLinks(text)).toEqual('at <a href="https://foo.com/?id=bar#asdf">https://foo.com/?id=bar#asdf</a>');
		});
		it("for urls followed by a question mark", function () {
			var text = "did you find it with http://www.foo.ca?";
			expect(util.addHtmlLinks(text)).toEqual('did you find it with <a href="http://www.foo.ca">http://www.foo.ca</a>?');
		});
		it("for urls followed by a comma", function () {
			var text = "at http://foo.com?id=bar#asdf, really?";
			expect(util.addHtmlLinks(text)).toEqual('at <a href="http://foo.com?id=bar#asdf">http://foo.com?id=bar#asdf</a>, really?');
		});
		it("but must be preceded by http", function () {
			var text = "at foo.com, really?";
			expect(util.addHtmlLinks(text)).toEqual('at foo.com, really?');
		});
	});

	describe("parses commands", function () {

		it("can view help", function () {
			messageInput.val = function () { return "/help"; };

			tracker.handleInput();
			expect(tracker.helpOpen()).toEqual(true);
		});

		it("can chat", function () {
			messageInput.val = function () { return "hello peeps"; };

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalledWith('user message', 'hello peeps');
		});

		it("can emote", function () {
			messageInput.val = function () { return ":)"; };

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalledWith('user message', ':)');
		});

		it("can reset", function () {
			messageInput.val = function () { return "/reset"; };

			spyOn(tracker, 'reset');
			tracker.handleInput();
			expect(tracker.reset).toHaveBeenCalled();
		});

		it("can create issues", function () {
			messageInput.val = function () { return "/create new issue"; };

			spyOn(tracker.issueManager, 'createIssue');
			tracker.handleInput();
			expect(tracker.issueManager.createIssue).toHaveBeenCalledWith("new issue");
		});

		it("mixed case and unicode works", function () {
			messageInput.val = function () { return "/CREATE Ω=aw3som#"; };

			spyOn(tracker.issueManager, 'createIssue');
			tracker.handleInput();
			expect(tracker.issueManager.createIssue).toHaveBeenCalledWith("Ω=aw3som#");
		});

		it ("can prioritize issues", function () {
			messageInput.val = function () { return "/star 5"; };

			spyOn(tracker.issueManager, 'prioritizeIssue');
			tracker.handleInput();
			expect(tracker.issueManager.prioritizeIssue).toHaveBeenCalledWith(5);
		});

		it ("can tag issues", function () {
			messageInput.val = function () { return "/tag 5 later"; };

			spyOn(tracker.issueManager, 'tagIssue');
			tracker.handleInput();
			expect(tracker.issueManager.tagIssue).toHaveBeenCalledWith(5, 'later');
		});
		
		it("can assign multi-digit issues", function () {
			messageInput.val = function () { return "/assign 50"; };
		
			spyOn(tracker.issueManager, 'assignIssue');
			tracker.handleInput();
			expect(tracker.issueManager.assignIssue).toHaveBeenCalledWith(50, undefined);
		});
		
		describe("handles invalid input", function () {

			it("bad command", function () {
				messageInput.val = function () { return "/fluffernutter"; };

				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});

			it("create no args", function () {
				messageInput.val = function () { return "/create"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("create whitespace only", function () {
				messageInput.val = function () { return "/create  "; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("assign no args", function () {
				messageInput.val = function () { return "/assign"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("assign bad id", function () {
				messageInput.val = function () { return "/assign this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("critical no args", function () {
				messageInput.val = function () { return "/critical"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("critical bad id", function () {
				messageInput.val = function () { return "/critical this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("edit no args", function () {
				messageInput.val = function () { return "/edit"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("edit bad id", function () {
				messageInput.val = function () { return "/edit not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("close no args", function () {
				messageInput.val = function () { return "/close"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("close bad id", function () {
				messageInput.val = function () { return "/close this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("reopen no args", function () {
				messageInput.val = function () { return "/reopen"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("reopen bad id", function () {
				messageInput.val = function () { return "/reopen this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
		});
	});
	
});

});