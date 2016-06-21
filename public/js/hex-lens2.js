var HexLensT = function(options) {
    this.name = 'HexLensT';
    
    this.outputOffset = [];
    this.outputHex = [];
    this.outputText = [];
    this.outputComments = [];
    
    this.startOffset = -1;
    this.endOffset = -1;
    this.length = 0;
    this.currContentWidth = -1;
    
    this.drops = [];
};

HexLensT.prototype.getName = function() {
    return this.name;
};

HexLensT.prototype.preprocessData = function(startOffset, endOffset, contentWidth) {
    
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.length = endOffset-startOffset;
    this.currContentWidth = contentWidth;
    
    fetchDataUint8(startOffset, endOffset);
    
    this.outputOffset = [];
    this.outputHex = [];
    this.outputText = [];
    this.outputComments = [];
    
            var outputHexLine = [];
            var outputTextLine = [];
    
            if (startOffset%16 != 0)
            {
                this.outputOffset.push('<div>0x' + ("00000000"+Math.floor(startOffset - startOffset%16).toString(16)).slice(-8).toUpperCase() + '</div>');
                for (var i = Math.floor(startOffset - startOffset%16); i < startOffset; i++)
                {
                    outputHexLine.push('<span class="blank">' + '&nbsp;&nbsp;' + '</span>');
                    outputTextLine.push('&nbsp;');
                }
            }

            for (var i = startOffset; i < endOffset; i++)
            {
                outputHexLine.push('<span data-offset="' + i.toString(10) + '">' + ("00"+byteView[i].toString(16)).slice(-2).toUpperCase() + '</span>');
                outputTextLine.push('<span data-offset="' + i.toString(10) + '">' + (byteView[i]>=32 && byteView[i]<=126 ? String.fromCharCode(byteView[i]) : '.') + '</span>');
                if (i%16 === 0) {
                    this.outputOffset.push('<div>0x' + ("00000000"+i.toString(16)).slice(-8).toUpperCase() + '</div>');
                    //this.outputComments.push('<input type="text" placeholder="Empty Comment" data-comment-id="' + (i/16) + '"><br>');
                    //outputComments.push('<span contenteditable="true" data-comment-id="' + (i/16) + '">Test</span>');
                }
                if (i%16 === 15) {
                    outputHexLine.push('<br>');
                    outputTextLine.push('<br>');
                    this.outputHex.push(outputHexLine.join(''));
                    this.outputText.push(outputTextLine.join(''));
                    outputHexLine = [];
                    outputTextLine = [];
                }
            }
            this.outputHex.push(outputHexLine.join(''));
            this.outputText.push(outputTextLine.join(''));
            outputHexLine = [];
            outputTextLine = [];
};

HexLensT.prototype.generateView = function(scrollPosY, viewWidth, viewHeight) {
    if (scrollPosY < 0) scrollPosY = 0;
    var sI = Math.floor(scrollPosY/20);
    var eI = sI + Math.floor(viewHeight/20) + 1;
    console.log("generateView: " + sI + " " + eI);
    var outputOffsetSlice = this.outputOffset.slice(sI, eI);
    
    var hexViewContent = '<div class="content hexview"><div class="offset">' + outputOffsetSlice.join('') + '</div><div class="hex">' + this.outputHex.slice(sI, eI).join('') + '</div><div class="text">' + this.outputText.slice(sI, eI).join('') + '</div><div class="comments">' + this.outputComments.slice(sI, eI).join('') + '</div></div>';
    return {content: hexViewContent, contentHeight: outputOffsetSlice.length*20, commentPopovers: true};
};

HexLensT.prototype.getContentHeight = function() {
    return this.outputOffset.length * 20;
};

HexLensT.prototype.getHeaderSummary = function() {
    return ('0x' + ("00000000" + this.startOffset.toString(16)).slice(-8).toUpperCase() + ' - 0x' + ("00000000" + (this.endOffset - 1).toString(16)).slice(-8).toUpperCase());
};

HexLensT.prototype.addCommentPopoverContent = function(commentOffset, newComment) {
    if (this.drops[commentOffset + "text"].isOpened() || this.drops[commentOffset + "hex"].isOpened()) {
        $('.thread-comment').last().after('<div class="thread-comment"><b>' + newComment.author + '</b>: ' + newComment.comment + "</div>");
        $('.thread-comments').scrollTop($('.thread-comments')[0].scrollHeight);
    }
};

HexLensT.prototype.removeCommentPopoverContent = function(commentOffset, commentIndex) {
    if (this.drops[commentOffset + "text"].isOpened() || this.drops[commentOffset + "hex"].isOpened()) {
        $('.thread-comment')[1].remove();
    }
};

HexLensT.prototype.addCommentPopoverContent = function(newComment) {
    if (this.drops[commentOffset + "text"].isOpened() || this.drops[commentOffset + "hex"].isOpened()){
        $('.thread-comment').last().after('<div class="thread-comment"><b>' + newComment.author + '</b>: ' + newComment.comment + "</div>");
        $('.thread-comments').scrollTop($('.thread-comments')[0].scrollHeight);
    }
};

HexLensT.prototype.getCommentPopoverContent = function() {
    var ctx = this;
    var thread = getThread(ctx.commentOffset);
    
    // Thread summary
    var contents = '<div class="thread-summary"><a href="#" id="comment-summary" data-type="text" data-title="Thread summary" class="editable editable-click" style="display: inline;">' + thread.getSummary() + '</a></div>';
    
    contents += '<div class="thread-comments">';
    for (var i = 0; i < thread.discussion.length; i++) {
        contents += '<div class="thread-comment" data-index="' + i + '"><b>' + thread.discussion[i].author + '</b>: ' + thread.discussion[i].comment + "</div>";
    }
    contents += '</div>';
    
    // Thread reply box/buttons
    contents += '<div class="thread-reply"><input type="text" placeholder="Reply..."></input><!--<div class="thread-reply-buttons"><div style="margin-top:8px;"><button type="button" class="btn btn-sm btn-primary" style="margin-right:8px;">Reply</button><button type="button" class="btn btn-sm btn-default">Cancel</button></div></div>--></div>';
    
    $('.drop-content').html(contents);
    
    $('.drop-content #comment-summary').editable({
        success: function(response, newValue) {
            thread.setSummary(newValue);
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
                    
                    thread.discussion.push({author: 'Anon', comment: $(this).val()});
                    $('.thread-comment').last().after('<div class="thread-comment"><b>' + 'Anon' + '</b>: ' + $(this).val() + "</div>");
                    $(this).val('');
                    $('.thread-comments').scrollTop($('.thread-comments')[0].scrollHeight);
                }
            }
        });
    
    ctx.lens.drops[ctx.commentOffset + ctx.location].position();
};


HexLensT.prototype.updateComments = function() {
    var regionThreads = getThreads(this.startOffset, this.endOffset);
    
    for (var i = 0; i < this.drops.length; i++) {
        drops[i].destroy();
    }
    this.drops = [];
    
    for (var i = 0; i < regionThreads.length; i++) {
        var queryElement = $('.cfasection[data-start-offset="' + this.startOffset + '"').next().find('[data-offset="' + regionThreads[i] + '"]:not(comment-caret)');
        queryElement.addClass('hasComment');
        queryElement.before('<comment-caret title="' + getThread(regionThreads[i]).getSummary() + '"data-offset="' + regionThreads[i] + '"><span></span></comment-caret>');
        
        for (var j = 0; j < queryElement.length; j++) {
            var location = 'hex';
            if (j === 1) location = 'text';
            
            queryElement.filter(':eq(' + j + ')').addClass('comment-' + location);
            
            var drop = new Drop({
                target: queryElement.filter(':eq(' + j + ')').prev('comment-caret')[0],
                content: '',
                position: 'top left',
                classes: 'drop-theme-basic comment-popover',
                remove: true,
                openOn: 'hover'
            });
            
            drop.on('open', this.getCommentPopoverContent, {lens: this,
                                                            commentOffset: regionThreads[i],
                                                            location: location
                                                           });
            this.drops[regionThreads[i] + location] = drop;
        }
    }
};