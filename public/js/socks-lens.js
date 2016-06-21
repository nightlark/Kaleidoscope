var SocksLens = function(options) {
    this.name = 'SocksLens';
};

SocksLens.prototype.getName = function() {
    return this.name;
};

SocksLens.prototype.getSettingList = function() {
    return [];
};

SocksLens.prototype.changeSettings = function(newSettings, reprocess) {
};

SocksLens.prototype.preprocessData = function(startOffset, endOffset, contentWidth) {
};

SocksLens.prototype.generateView = function(scrollPosY, viewWidth, viewHeight) {
    return {content: '<div><img src="http://s.wsj.net/public/resources/MWimages/MW-CB737_nikeso_ME_20140502143517.jpg"></div>', contentHeight: 252, commentPopovers: false};
};

SocksLens.prototype.getContentHeight = function() {
    return 252;
};

SocksLens.prototype.getHeaderSummary = function() {
    return ('Socks');
};

SocksLens.prototype.addCommentPopoverContent = function(commentOffset, newComment) {
};

SocksLens.prototype.removeCommentPopoverContent = function(commentOffset, commentIndex) {
};

SocksLens.prototype.addCommentPopoverContent = function(newComment) {
};

SocksLens.prototype.getCommentPopoverContent = function() {
};


SocksLens.prototype.updateComments = function() {
};