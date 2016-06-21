var CommentPopover = function(options) {
    this.drop = undefined;
    
    this.threadContents = [];
    this.threadList = [];
    this.threadOffset = -1;
    this.numAddresses = 0;
    this.lens;
    
    this.lastSelectedThreadCI = -1;
    this.lastSelectedThread = -1;
};

CommentPopover.prototype.containsComment = function(threadOffset) {
    return threadOffset >= this.threadOffset && threadOffset < (this.threadOffset + this.numAddresses);
};

CommentPopover.prototype.isOpened = function() {
    return this.drop.isOpened();
};

CommentPopover.prototype.position = function() {
    this.drop.position();
};

CommentPopover.prototype.destroy = function() {
    if (typeof this.drop !== typeof null) {
        this.drop.destroy();
    }
    
    this.threadContents = [];
    this.threadList = [];
    this.threadOffset = -1;
    this.numAddresses = 0;
    this.lens = '';
    
    this.lastSelectedThreadCI = -1;
};

CommentPopover.prototype.updateThreadSummary = function(threadOffset) {
    if (!this.containsComment(threadOffset)) return;
    
    this.threadContents[threadOffset-this.threadOffset] = this.createThreadContent(threadOffset);
    
    if (this.drop.isOpened()) {
        $('#comment-summary').text(getThread(threadOffset).getSummary());
    }
};
CommentPopover.prototype.addCommentPopoverUpdate = function(threadOffset, comment, author) {
    if (!this.containsComment(threadOffset)) return;
    
    this.threadContents[threadOffset-this.threadOffset] = this.createThreadContent(threadOffset);
    
    if (this.drop.isOpened()) {
        $('.thread-comment').last().after('<div class="thread-comment"><b>' + author + '</b>: ' + comment + "</div>");
        $('.thread-comments').scrollTop($('.thread-comments')[0].scrollHeight);
        this.position();
    }
};

CommentPopover.prototype.initPopover = function(target, threadOffset, numAddresses, lens) {
    this.drop = new Drop({
        target: target,
        content: '',
        position: 'top center',
        classes: 'drop-theme-basic comment-popover',
        remove: true,
        constrainToScrollParent: true,
        openOn: 'click'
    });
    
    this.lens = lens;
    this.threadOffset = threadOffset;
    this.numAddresses = numAddresses;
    this.threadList.length = 0;
    
    var regionThreads = getThreads(threadOffset, threadOffset + numAddresses);
    for (var rT in regionThreads) {
        this.threadContents[regionThreads[rT]-threadOffset] = this.createThreadContent(regionThreads[rT]);
        this.threadList.push({index: regionThreads[rT]-threadOffset, offset: regionThreads[rT], address: "0x" + ("00000000"+Math.floor(regionThreads[rT]).toString(16)).slice(-8).toUpperCase()});
    }
    
    this.lastSelectedThreadCI = this.threadList[0].index;
    this.lastSelectedThread = this.threadList[0];
    
    this.drop.on('open', this.setupCommentPopover, this);
};

CommentPopover.prototype.createThreadContent = function(threadOffset) {
    var thread = getThread(threadOffset);
    
    // Thread summary
    var contents = '<div class="thread-summary"><a href="#" id="comment-summary" data-type="text" data-title="Thread summary" class="editable editable-click" style="display: inline;">' + thread.getSummary() + '</a></div>';
    
    contents += '<div class="thread-comments">';
    for (var i = 0; i < thread.discussion.length; i++) {
        contents += '<div class="thread-comment" data-index="' + i + '"><b>' + thread.discussion[i].author + '</b>: ' + thread.discussion[i].comment + "</div>";
    }
    contents += '</div>';
    
    return contents;
};

CommentPopover.prototype.setupCommentPopover = function() {
    var ctx = this;
    
    for (var d in Drop.drops) {
        if (Drop.drops[d] !== ctx.drop) {
            Drop.drops[d].close();
        }
    }
    
    var threadSelect = '<div class="thread-select">';
    var threadReply =  '<div class="thread-reply"><input type="text" placeholder="Reply..."></input><!--<div class="thread-reply-buttons"><div style="margin-top:8px;"><button type="button" class="btn btn-sm btn-primary" style="margin-right:8px;">Reply</button><button type="button" class="btn btn-sm btn-default">Cancel</button></div></div>--></div>';
    
    if (this.numAddresses > 1) {
        threadSelect += '<select>';
        for (var th in this.threadList) {
            threadSelect += '<option value="' + this.threadList[th].index + '">' + this.threadList[th].address + '</option>';
        }
        threadSelect += '</select>';
    } else {
        threadSelect += "0x" + ("00000000"+Math.floor(this.threadOffset).toString(16)).slice(-8).toUpperCase();
    }
    
    threadSelect += '</div>';
    
    if (this.numAddresses > 1) {
        $('.drop-content').html(threadSelect + '<div class="thread-contents">' + this.threadContents[this.lastSelectedThreadCI] + '</div>' + threadReply);
        var selectedThread = $('.drop-content .thread-select select');
            
        selectedThread.change(function() {
            console.log('changed view thread');
            ctx.lastSelectedThreadCI = this.value;
            for (var th in ctx.threadList) {
                console.log(ctx.threadList[th].index);
                if (ctx.threadList[th].index === parseInt(this.value)) {
                    ctx.lastSelectedThread = ctx.threadList[th];
                }
            }
            
            $('.drop-content #comment-summary').editable("destroy");
            
            $('.drop-content .thread-contents').html(ctx.threadContents[this.value]);
            
            $('.drop-content #comment-summary').editable({
        success: function(response, newValue) {
            socket.emit('setThreadSummary', {threadOffset: ctx.lastSelectedThread.offset, summary: newValue});
        },
        escape: true
    });
            //ctx.drop.position();
        });
        
        $('.drop-content .thread-select select').val(ctx.lastSelectedThreadCI);
    } else {
        $('.drop-content').html(threadSelect + '<div class="thread-contents">' + this.threadContents[0] + '</div>' + threadReply);
    }
    
    $('.drop-content #comment-summary').editable({
        success: function(response, newValue) {
            socket.emit('setThreadSummary', {threadOffset: ctx.lastSelectedThread.offset, summary: newValue});
        },
        escape: true
    });
    
    $('.thread-comments').scrollTop($('.thread-comments')[0].scrollHeight);
    
    $('.drop-content .thread-reply input').on({
            focus      : function(e) {
                $(this).parent('.thread-reply').addClass('reply-input-typing');
            },
            focusout   : function(e) {
                $(this).parent('.thread-reply').removeClass('reply-input-typing');
            },
            keyup      : function(e) {
                if (e.keyCode === 13) {
                    if ($(this).val() === '') return;
                    console.log(ctx);
                    socket.emit('addComment', {threadOffset: ctx.lastSelectedThread.offset, comment: $(this).val()});
                    $(this).val('');
                }
            }
        });
    
    this.drop.position();
};