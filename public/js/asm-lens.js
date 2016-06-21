var AsmLens = function(options) {
    this.name = 'AsmLens';
    
    this.outputStrings = [];
    
    this.startOffset = -1;
    this.endOffset = -1;
    this.length = 0;
    this.currContentWidth = -1;
    
    this.commentPopovers = [];
    
    this.arch = capstone.ARCH_X86;
    this.mode = capstone.MODE_64;
    this.endianness = capstone.MODE_LITTLE_ENDIAN;
};

AsmLens.prototype.getName = function() {
    return this.name;
};

AsmLens.prototype.getSettingList = function() {
    return [{name: 'arch', label: 'Architecture', type: 'list', options: [{k:capstone.ARCH_ARM,v:'ARM'},{k:capstone.ARCH_ARM64,v:'ARM64'},{k:capstone.ARCH_MIPS,v:'MIPS'},{k:capstone.ARCH_X86,v:'x86'},{k:capstone.ARCH_PPC,v:'PowerPC'},{k:capstone.ARCH_SPARC,v:'SPARC'},{k:capstone.ARCH_SYSZ,v:'SystemZ'},{k:capstone.ARCH_XCORE,v:'XCore'}], value: this.arch},
           {name: 'mode', label: 'Mode', type: 'list', options: [{k:capstone.MODE_16,v:'16-bit'},{k:capstone.MODE_32,v:'32-bit'},{k:capstone.MODE_64,v:'64-bit'}], value: this.mode}];
};

AsmLens.prototype.initialSettings = function(settings) {
    this.arch = parseInt(settings['arch']);
    this.mode = parseInt(settings['mode']);
};

AsmLens.prototype.changeSettings = function(newSettings, reprocess) {
    this.arch = parseInt(newSettings['arch']);
    this.mode = parseInt(newSettings['mode']);
    
    if (reprocess) {
        this.preprocessData(this.startOffset, this.endOffset, this.currContentWidth);
    }
};

AsmLens.prototype.preprocessData = function(startOffset, endOffset, contentWidth) {
    this.outputStrings = [];
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.length = endOffset-startOffset;
    this.currContentWidth = contentWidth;
    
    var oS = this.outputStrings;
    var stringStartOffset = startOffset;
    var maxWidth = (contentWidth*.5 < $(window).width*.55) ? $(window).width*.55 : contentWidth*.5;
    var startOffsetHex;
    var currStrLen = 0;
    
    // Initialize the decoder
    var cs = new capstone.Cs(this.arch, this.mode | this.endianness);

    var typedArray = new Uint8Array(arrayBuffer, startOffset, endOffset - startOffset);
    // Output: Array of capstone.Instruction objects
    var instructions = cs.disasm(typedArray, startOffset);
    console.log(instructions);
    var i = 0;

    // Display results;
    instructions.forEach(function(instr) {
        console.log("0x%s:\t%s\t%s",
            instr.address.toString(16),
            instr.mnemonic,
            instr.op_str
        );
        // instr.size gives number of bytes taken up (useful for comment marker)
        startOffsetHex = '<span class="offset">0x' + ("00000000"+instr.address.toString(16)).slice(-8).toUpperCase() + '</span>';
        oS.push('<div class="asminstr" data-offset="' + instr.address + '" data-length="' + instr.size + '">' + startOffsetHex +
                                '<span class="text" style="width:' + maxWidth + 'px;">' + instr.mnemonic + ' ' + instr.op_str + '</span>' +
                                '<span class="comment"></span>' +
                                //'<span class="glyphicon glyphicon-option-horizontal"></span>' +
                                '</div>');
        
        //outputAddress.push('<span>0x' + instr.address.toString(16) + '</span><br>');
        //outputInstruction.push('<span>' + instr.mnemonic + ' ' + instr.op_str + '</span><br>');
        //outputComments.push('<input type="text" placeholder="Empty Comment" data-comment-id="' + i + '"><br>');
        i++;
    });
};

AsmLens.prototype.generateView = function(scrollPosY, viewWidth, viewHeight) {
    if (scrollPosY < 0) scrollPosY = 0;
    var sI = Math.floor(scrollPosY/20);
    var eI = sI + Math.floor(viewHeight/20) + 1;
    console.log("generate Asm View: " + sI + " " + eI);
    
    var AsmViewContent = '<div class="content asmview">' + this.outputStrings.slice(sI, eI).join('') + '</div>';
    return {content: AsmViewContent, contentHeight: this.outputStrings.slice(sI, eI).length * 20, commentPopovers: false};
};

AsmLens.prototype.getContentHeight = function() {
    return this.outputStrings.length * 20;
};

AsmLens.prototype.getHeaderSummary = function() {
    return ('Assembly (' + this.outputStrings.length + ')');
};

AsmLens.prototype.windowResized = function(newWidth) {
    if (newWidth !== this.currContentWidth) {
        this.preprocessData(this.startOffset, this.endOffset, newWidth);
    }
};

AsmLens.prototype.removeCommentPopoverContent = function(commentOffset, commentIndex) {
    if (this.commentPopovers[commentOffset].isOpened()) {
        $('.thread-comment')[1].remove();
    }
};

AsmLens.prototype.getCommentPopoverContent = function() {
    var ctx = this;
    
    setupCommentPopover(ctx.commentOffset, ctx.numThreads);
    
    ctx.lens.commentPopovers[ctx.commentOffset].position();
};

AsmLens.prototype.addCommentPopoverContent = function(threadOffset, comment, author) {
    for (var cPopover in this.commentPopovers) {
        this.commentPopovers[cPopover].addCommentPopoverUpdate(threadOffset, comment, author);
    }
};

AsmLens.prototype.updateThreadSummary = function(threadOffset) {
    for (var cPopover in this.commentPopovers) {
        this.commentPopovers[cPopover].updateThreadSummary(threadOffset);
    }
    
    var queryElement = $('.cfasection[data-start-offset="' + this.startOffset + '"]').next().find('.cstring[data-offset="' + threadOffset + '"] .comment');
    if (queryElement.length !== 0) {
        var ellipses = (getThread(regionThreads[i]).discussion.length > 1 || (getThread(regionThreads[i]).discussion.length !== 0 && getThread(regionThreads[i]).getSummary() != getThread(regionThreads[i]).discussion[0].comment)) ? "..." : "";
        queryElement.text(getThread(threadOffset).getSummary()+ellipses);
    }
};

AsmLens.prototype.updateComments = function() {
    var regionThreads = getThreads(this.startOffset, this.endOffset);
    
    for (var i = 0; i < this.commentPopovers.length; i++) {
        if (typeof this.commentPopovers[i] !== typeof undefined) {
            this.commentPopovers[i].destroy();
        }
    }
    this.commentPopovers = [];
    console.log(regionThreads);
    var queryElements = $('.cfasection[data-start-offset="' + this.startOffset + '"').next().find('.asminstr');
    
    for (var j = 0; j < queryElements.length; j++) {
        var queryElement = queryElements.filter(':eq(' + j + ')');
        var asmStartOffset = parseInt(queryElement.data('offset'));
        var instrLen = parseInt(queryElement.data('length'));
        queryElement.removeClass('hasComment');
        for (var i = 0; i < regionThreads.length; i++) {
            if (!queryElement.hasClass('hasComment')) {
                if (regionThreads[i] >= asmStartOffset && regionThreads[i] < asmStartOffset+instrLen) {
                    queryElement.addClass('hasComment');
                   
                    var ellipses = (getThread(regionThreads[i]).discussion.length > 1 || (getThread(regionThreads[i]).discussion.length !== 0 && getThread(regionThreads[i]).getSummary() != getThread(regionThreads[i]).discussion[0].comment)) ? "..." : "";                    
                    queryElement.find('.comment').text(getThread(regionThreads[i]).getSummary()+ellipses);
            
                    var commentPopover = new CommentPopover();
                    commentPopover.initPopover(queryElement.find('.comment')[0], regionThreads[i], instrLen, this);
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
                    $('div.asmview').find('[data-offset="' + dataOffset + '"]:not(.comments)').addClass("toolAffect");
                } else if (toolMode === 'comment') {
                    $('div.asmview').find('.comments[data-offset="' + dataOffset + '"]').addClass("toolAffect");
                }
            },
            mouseleave : function() {
                var dataOffset = parseInt($(this).parent().attr('data-offset'));
                $(this).removeClass("toolAffect");
                if (toolMode === 'split') {
                    $('div.asmview').find('[data-offset="' + dataOffset + '"]:not(.comments)').removeClass("toolAffect");
                } else if (toolMode === 'comment') {
                    $('div.asmview').find('.comments[data-offset="' + dataOffset + '"]').removeClass("toolAffect");
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
        }, '.asmview span:not(.blank)');