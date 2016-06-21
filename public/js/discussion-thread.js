var DiscussionThread = function() {
    this.summary = '';
    this.discussion = [];
};

DiscussionThread.prototype.getSummary = function() {
    return this.summary;
};

DiscussionThread.prototype.setSummary = function(s) {
    this.summary = s;
};

DiscussionThread.prototype.getLength = function(a, c, indx) {
    return this.discussion.length;
};

DiscussionThread.prototype.addComment = function(a, c, indx) {
    this.discussion.splice(indx, 0, {author: a, comment: c});
};

DiscussionThread.prototype.deleteComment = function(indx) {
    this.discussion.splice(indx, 1);
};