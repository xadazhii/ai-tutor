"use strict";

function escapeHtml(unsafe) {
    return unsafe.replace(/[&<"']/g, function(m) {
        switch (m) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#039;';
            default: return m;
        }
    });
}

function highlightSyntax(code, lang) {
    if (lang === 'java') {
        const keywordRegex = /\b(class|public|static|void|int|String|new|return|if|else|for|while|try|catch|finally|throw|throws|package|import|private|protected|extends|implements|enum|interface|abstract|final|synchronized|volatile|transient)\b(?!\s*[\(\)\[\]\{\}\=\+\-\*\/\%])/g;
        code = code.replace(keywordRegex, '<span class="keyword">$1</span>');

        code = code.replace(/\b(\d+)\b/g, '<span class="number">$1</span>'); 
    }
    return code;
}

function processMarkdown(markdown) {
    markdown = markdown.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
        code = escapeHtml(code.trim());
        code = highlightSyntax(code, lang);
        lang = lang ? ` class="language-${lang}"` : '';
        return `<pre><code${lang}>${code}</code></pre>`;
    });

    markdown = markdown.replace(/(^|[^`])\n/g, '$1<br>');

    markdown = markdown.replace(/(^|[^`])\*\*(.*?)\*\*/g, '$1<b>$2</b>');

    markdown = markdown.replace(/(^|[^`])_(.*?)_/g, '$1<i>$2</i>');
    markdown = markdown.replace(/(^|[^`])\*(.*?)\*/g, '$1<i>$2</i>');

    return markdown;
}

component('message', (node, state) => {
    createNode('div', node, div => {
        createNode('p', div, p => {
            p.innerHTML = processMarkdown(state.msg);
        });
    });
});
