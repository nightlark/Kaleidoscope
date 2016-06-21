var HexLens = function(options) {
    this.name = 'HexLens';
    
    this.outputOffset = [];
    this.outputHex = [];
    this.outputText = [];
    this.outputComments = [];
    
    this.startOffset = -1;
    this.endOffset = -1;
    this.length = 0;
    this.currContentWidth = -1;
    
    this.bpl = 0;
    this.firstDrawByteOffset = 0;
    this.lastFirstDrawByteOffset = 0;
    
    this.commentPopovers = [];
};

HexLens.prototype.getName = function() {
    return this.name;
};

HexLens.prototype.getSettingList = function() {
    return [];
};

HexLens.prototype.changeSettings = function(newSettings, reprocess) {
};

HexLens.prototype.preprocessData = function(startOffset, endOffset, contentWidth) {
    
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

            var bpl = Math.floor((contentWidth-120)/40);
            bpl = Math.floor(bpl/8) * 8;
            this.bpl = bpl;
    
            if (startOffset%bpl != 0)
            {
                this.outputOffset.push('<div>0x' + ("00000000"+Math.floor(startOffset - startOffset%bpl).toString(16)).slice(-8).toUpperCase() + '</div>');
                for (var i = Math.floor(startOffset - startOffset%bpl); i < startOffset; i++)
                {
                    outputHexLine.push('<span class="blank">' + '&nbsp;&nbsp;' + '</span>');
                    outputTextLine.push('<span class="blank">&nbsp;</span>');
                }
            }

            for (var i = startOffset; i < endOffset; i++)
            {
                outputHexLine.push('<span data-offset="' + i.toString(10) + '">' + ("00"+byteView[i].toString(16)).slice(-2).toUpperCase() + '</span>');
                outputTextLine.push('<span data-offset="' + i.toString(10) + '">' + (byteView[i]>=32 && byteView[i]<=126 ? String.fromCharCode(byteView[i]) : '.') + '</span>');
                if (i%bpl === 0) {
                    this.outputOffset.push('<div>0x' + ("00000000"+i.toString(16)).slice(-8).toUpperCase() + '</div>');
                    //this.outputComments.push('<input type="text" placeholder="Empty Comment" data-comment-id="' + (i/16) + '"><br>');
                    //outputComments.push('<span contenteditable="true" data-comment-id="' + (i/16) + '">Test</span>');
                }
                if (i%bpl === bpl-1) {
                    outputHexLine.push('<br>');
                    outputTextLine.push('<br>');
                    this.outputHex.push(outputHexLine.join(''));
                    this.outputText.push(outputTextLine.join(''));
                    outputHexLine = [];
                    outputTextLine = [];
                }
            }
    
            if (endOffset % bpl !== 0) {
                for (var i = endOffset%bpl; i < bpl; i++)
                {
                    outputHexLine.push('<span class="blank">' + '&nbsp;&nbsp;' + '</span>');
                    outputTextLine.push('&nbsp;');
                }
            }
    
            this.outputHex.push(outputHexLine.join(''));
            this.outputText.push(outputTextLine.join(''));
            outputHexLine = [];
            outputTextLine = [];
};

HexLens.prototype.generateView = function(scrollPosY, viewWidth, viewHeight) {
    if (scrollPosY < 0) scrollPosY = 0;
    var sI = Math.floor(scrollPosY/20);
    var eI = sI + Math.floor(viewHeight/20) + 1;
    console.log("generate Hex View: " + sI + " " + eI);
    var outputOffsetSlice = this.outputOffset.slice(sI, eI);
    
    this.lastFirstDrawByteOffset = this.firstDrawByteOffset;
    this.firstDrawByteOffset = sI * this.bpl;
    
    var hexViewContent = '<div class="content hexview"><div class="offset">' + outputOffsetSlice.join('') + '</div><div class="hex">' + this.outputHex.slice(sI, eI).join('') + '</div><div class="text">' + this.outputText.slice(sI, eI).join('') + '</div><div class="comments">' + this.outputComments.slice(sI, eI).join('') + '</div></div>';
    return {content: hexViewContent, contentHeight: outputOffsetSlice.length*20, commentPopovers: true};
};

HexLens.prototype.windowResized = function(newWidth) {
    if (newWidth !== this.currContentWidth) {
        this.preprocessData(this.startOffset, this.endOffset, newWidth);
    }
};

HexLens.prototype.getContentHeight = function() {
    return this.outputOffset.length * 20;
};

HexLens.prototype.getHeaderSummary = function() {
    return ('0x' + ("00000000" + this.startOffset.toString(16)).slice(-8).toUpperCase() + ' - 0x' + ("00000000" + (this.endOffset - 1).toString(16)).slice(-8).toUpperCase() + ' (Len: ' + this.length + ')');
};

HexLens.prototype.removeCommentPopoverContent = function(commentOffset, commentIndex) {
    if (this.commentPopovers[commentOffset + "text"].isOpened() || this.commentPopovers[commentOffset + "hex"].isOpened()) {
        $('.thread-comment')[1].remove();
    }
};

HexLens.prototype.addCommentPopoverContent = function(threadOffset, comment, author) {
    for (var cPopover in this.commentPopovers) {
        this.commentPopovers[cPopover].addCommentPopoverUpdate(threadOffset, comment, author);
    }
};

HexLens.prototype.updateComments = function() {
    var regionThreads = getThreads(this.startOffset, this.endOffset);
    
    for (var i = 0; i < this.commentPopovers.length; i++) {
        if (typeof this.commentPopovers[i] !== "undefined") {
            this.commentPopovers[i].destroy();
        }
    }
    this.commentPopovers = [];
    
    for (var i = 0; i < regionThreads.length; i++) {
        var queryElement = $('.cfasection[data-start-offset="' + this.startOffset + '"').next().find('[data-offset="' + regionThreads[i] + '"]:not(comment-caret)');
        queryElement.addClass('hasComment');
        queryElement.before('<comment-caret title="' + getThread(regionThreads[i]).getSummary() + '"data-offset="' + regionThreads[i] + '"><span></span></comment-caret>');
        
        for (var j = 0; j < queryElement.length; j++) {
            var location = 'hex';
            if (j === 1) location = 'text';
            
            queryElement.filter(':eq(' + j + ')').addClass('comment-' + location);
            
            var commentPopover = new CommentPopover();
            commentPopover.initPopover(queryElement.filter(':eq(' + j + ')').prev('comment-caret')[0], regionThreads[i], 1, this);
            this.commentPopovers[regionThreads[i] + location] = commentPopover;
        }
    }
};

$('body').on({
        mouseenter : function() {
            if (toolMode === 'split') {
                //$(this).addClass("toolAffect");
                $('div.hexview').find('[data-offset="' + $(this).attr('data-offset') + '"]').addClass("toolAffect");
            } else if (toolMode === 'comment') {
                $('div.hexview').find('[data-offset="' + $(this).attr('data-offset') + '"]').addClass("toolAffect");
            }
        },
        mouseleave : function() {
            //$(this).removeClass("toolAffect");
            $('div.hexview').find('[data-offset="' + $(this).attr('data-offset') + '"]').removeClass("toolAffect");
        },
        click      : function() {
            if (toolMode === 'split') {
                socket.emit('split', {splitOffset: parseInt($(this).attr('data-offset'))});
            } else if (toolMode === 'comment') {
                if (!threadExists(parseInt($(this).attr('data-offset')))) {
                    $('.create-comment-modal').data('offset', parseInt($(this).attr('data-offset')));
                    $('.create-comment-modal').modal('show');
                }
            }
            return false;
        }
    }, '.hexview span:not(.blank)');