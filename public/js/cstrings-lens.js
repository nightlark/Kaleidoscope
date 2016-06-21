var CStringsLens = function(options) {
    this.name = 'CStringsLens';
    
    this.outputStrings = [];
    
    this.startOffset = -1;
    this.endOffset = -1;
    this.length = 0;
    this.currContentWidth = -1;
    
    this.commentPopovers = [];
};

CStringsLens.prototype.getName = function() {
    return this.name;
};

CStringsLens.prototype.getSettingList = function() {
    return [];
};

CStringsLens.prototype.changeSettings = function(newSettings, reprocess) {
};

CStringsLens.prototype.preprocessData = function(startOffset, endOffset, contentWidth) {
    this.outputStrings = [];
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.length = endOffset-startOffset;
    this.currContentWidth = contentWidth;
    
    var currString = '';
    var stringStartOffset = startOffset;
    var maxWidth = (contentWidth*.5 < $(window).width*.55) ? $(window).width*.55 : contentWidth*.5;
    var startOffsetHex;
    var currStrLen = 0;
    
    
    
    for (var i = startOffset; i < endOffset; i++) {
        if (byteView[i] === 0) {
            if (currString === '') {
                stringStartOffset = i+1;
            } else {
                startOffsetHex = '<span class="offset">0x' + ("00000000"+stringStartOffset.toString(16)).slice(-8).toUpperCase() + '</span>';
                currStrLen = i - stringStartOffset;
                this.outputStrings.push('<div class="cstring" data-offset="' + stringStartOffset + '" data-length="' + currStrLen + '">' + startOffsetHex +
                                        '<span class="text" style="width:' + maxWidth + 'px;">' + currString + '</span>' +
                                        '<span class="comment"></span>' +
                                        //'<span class="glyphicon glyphicon-option-horizontal"></span>' +
                                        '</div>');
                stringStartOffset = i+1;
                currString = '';
                currStrLen = 0;
            }
        }
        currString += (byteView[i]>=32 && byteView[i]<=126 ? String.fromCharCode(byteView[i]) : '');
        currStrLen++;
    }
    
    if (currString !== '') {
        startOffsetHex = '<span class="offset">0x' + ("00000000"+stringStartOffset.toString(16)).slice(-8).toUpperCase() + '</span>';
        this.outputStrings.push('<div class="cstring" data-offset="' + stringStartOffset + '" data-length="' + currStrLen + '">' + startOffsetHex +
                                '<span class="text" style="width:' + maxWidth + 'px;">' + currString + '</span>' +
                                '<span class="comment"></span>' +
                                //'<span class="glyphicon glyphicon-option-horizontal"></span>' +
                                '</div>');
    }
};

CStringsLens.prototype.generateView = function(scrollPosY, viewWidth, viewHeight) {
    if (scrollPosY < 0) scrollPosY = 0;
    var sI = Math.floor(scrollPosY/20);
    var eI = sI + Math.floor(viewHeight/20) + 1;
    console.log("generate CStrings View: " + sI + " " + eI);
    
    var cstringsViewContent = '<div class="content cstringsview">' + this.outputStrings.slice(sI, eI).join('') + '</div>';
    return {content: cstringsViewContent, contentHeight: this.outputStrings.slice(sI, eI).length * 20, commentPopovers: false};
};

CStringsLens.prototype.getContentHeight = function() {
    return this.outputStrings.length * 20;
};

CStringsLens.prototype.getHeaderSummary = function() {
    return ('C Strings (' + this.outputStrings.length + ')');
};

CStringsLens.prototype.windowResized = function(newWidth) {
    if (newWidth !== this.currContentWidth) {
        this.preprocessData(this.startOffset, this.endOffset, newWidth);
    }
};

CStringsLens.prototype.removeCommentPopoverContent = function(commentOffset, commentIndex) {
    if (this.commentPopovers[commentOffset].isOpened()) {
        $('.thread-comment')[1].remove();
    }
};

CStringsLens.prototype.getCommentPopoverContent = function() {
    var ctx = this;
    
    setupCommentPopover(ctx.commentOffset, ctx.numThreads);
    
    ctx.lens.commentPopovers[ctx.commentOffset].position();
};

CStringsLens.prototype.addCommentPopoverContent = function(threadOffset, comment, author) {
    for (var cPopover in this.commentPopovers) {
        this.commentPopovers[cPopover].addCommentPopoverUpdate(threadOffset, comment, author);
    }
};

CStringsLens.prototype.updateThreadSummary = function(threadOffset) {
    for (var cPopover in this.commentPopovers) {
        this.commentPopovers[cPopover].updateThreadSummary(threadOffset);
    }
    
    var queryElement = $('.cfasection[data-start-offset="' + this.startOffset + '"]').next().find('.cstring[data-offset="' + threadOffset + '"] .comment');
    if (queryElement.length !== 0) {
        var ellipses = (getThread(regionThreads[i]).discussion.length > 1 || (getThread(regionThreads[i]).discussion.length !== 0 && getThread(regionThreads[i]).getSummary() != getThread(regionThreads[i]).discussion[0].comment)) ? "..." : "";
        queryElement.text(getThread(threadOffset).getSummary() + ellipses);
    }
};

CStringsLens.prototype.updateComments = function() {
    var regionThreads = getThreads(this.startOffset, this.endOffset);
    
    for (var i = 0; i < this.commentPopovers.length; i++) {
        if (typeof this.commentPopovers[i] !== typeof undefined) {
            this.commentPopovers[i].destroy();
        }
    }
    this.commentPopovers = [];
    console.log(regionThreads);
    var queryElements = $('.cfasection[data-start-offset="' + this.startOffset + '"').next().find('.cstring');
    
    for (var j = 0; j < queryElements.length; j++) {
        var queryElement = queryElements.filter(':eq(' + j + ')');
        var cstringStartOffset = parseInt(queryElement.data('offset'));
        var cstringLen = parseInt(queryElement.data('length'));
        queryElement.removeClass('hasComment');
        for (var i = 0; i < regionThreads.length; i++) {
            if (!queryElement.hasClass('hasComment')) {
                if (regionThreads[i] >= cstringStartOffset && regionThreads[i] < cstringStartOffset+cstringLen) {
                    queryElement.addClass('hasComment');
                   
                    var ellipses = (getThread(regionThreads[i]).discussion.length > 1 || (getThread(regionThreads[i]).discussion.length !== 0 && getThread(regionThreads[i]).getSummary() != getThread(regionThreads[i]).discussion[0].comment)) ? "..." : "";
                    queryElement.find('.comment').text(getThread(regionThreads[i]).getSummary() + ellipses);
            
                    var commentPopover = new CommentPopover();
                    commentPopover.initPopover(queryElement.find('.comment')[0], regionThreads[i], cstringLen, this);
                    this.commentPopovers[regionThreads[i]] = commentPopover;
                }
            }
        }
    }
};

$('body').on({
            mouseenter : function() {
                var dataOffset = parseInt($(this).parent().attr('data-offset'));
                if (toolMode === 'split') {
                    $(this).addClass("toolAffect");
                    $('div.cstringsview').find('[data-offset="' + dataOffset + '"]:not(.comments)').addClass("toolAffect");
                } else if (toolMode === 'comment') {
                    $('div.cstringsview').find('.comments[data-offset="' + dataOffset + '"]').addClass("toolAffect");
                }
            },
            mouseleave : function() {
                var dataOffset = parseInt($(this).parent().attr('data-offset'));
                $(this).removeClass("toolAffect");
                if (toolMode === 'split') {
                    $('div.cstringsview').find('[data-offset="' + dataOffset + '"]:not(.comments)').removeClass("toolAffect");
                } else if (toolMode === 'comment') {
                    $('div.cstringsview').find('.comments[data-offset="' + dataOffset + '"]').removeClass("toolAffect");
                }
            },
            click      : function() {
                var dataOffset = parseInt($(this).parent().attr('data-offset'));
                if (toolMode === 'split') {
                    socket.emit('split', {splitOffset: dataOffset});
                } else if (toolMode === 'comment') {
                    if (!threadExists(parseInt(dataOffset))) {
                        $('.create-comment-modal').data('offset', dataOffset);
                        $('.create-comment-modal').modal('show');
                    }
                }
                return false;
            }
        }, '.cstringsview span:not(.blank)');