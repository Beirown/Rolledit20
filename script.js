let undoStack = [];
let redoStack = [];
let styleTag;
let htmlContent;

// HTML 엔티티 변환
function encodeHTML(str) { return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function decodeHTML(str) { const t = document.createElement('textarea'); t.innerHTML = str; return t.value; }

// 메뉴 전환
$('#show-file').on('click', function () {
    $('#section-edit').hide();
    $('#section-upload').show();
});

// 🔹 상태 저장
function saveState() {
    undoStack.push($('#log-view').html());
    if (undoStack.length > 20) undoStack.shift();
    redoStack = [];
}

// 🔹 상태 복원
function restoreState(html) {
    $('#log-view').html(html);
    attachControls();
}

// 🔹 Undo / Redo
function undo() {
    if (undoStack.length === 0) return;
    redoStack.push($('#log-view').html());
    const prev = undoStack.pop();
    restoreState(prev);
}
function redo() {
    if (redoStack.length === 0) return;
    undoStack.push($('#log-view').html());
    const next = redoStack.pop();
    restoreState(next);
}

// 🔹 단축키
$(document).on('keydown', function (e) {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
});

// 저장된 HTML 파일 올리기
$('#log-html').on('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.html')) {
        alert('HTML 파일만 업로드할 수 있습니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        if (!e.target.result.includes('div class="message')) {
            alert('롤20 형식의 HTML이 아닙니다.');
            return;
        }
        $('#log-text').val(e.target.result);
    };
    reader.readAsText(file, 'utf-8');
});

// 시트 템플릿 선택
$('#css-select').on('change', function () {
    const cssFile = $(this).val();
    if (!cssFile) return;

    $('#css-view').text(cssFile);
    $('#css-sheet').attr('href', cssFile);

    styleTag = null;

    fetch(`./${cssFile}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(cssContent => {
            styleTag = `<style id="loaded-style">\n${cssContent}\n</style>`;
        })
});

// 커스텀 시트 CSS 올리기
$('#log-css').on('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.css')) {
        alert('CSS 파일만 업로드할 수 있습니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const cssText = e.target.result;

        if (!/\.sheet-rolltemplate-/.test(cssText)) {
            alert('롤20 형식의 CSS가 아닙니다.');
            extractedCss = '';
            return;
        }

        const matches = cssText.match(
            /(?:\.sheet-rolltemplate-[^{]+{[^}]*}|@[^{]+{[^}]*})/gs
        );

        if (!matches || matches.length === 0) {
            alert('롤20 형식의 CSS가 아닙니다.');
            extractedCss = '';
            return;
        }

        extractedCss = matches.join('\n\n');
        styleTag = null;
        styleTag = `<style>${extractedCss}</style>`;
        $('head').append(styleTag);
    };

    reader.readAsText(file, 'utf-8');
    $('#css-view').text(file.name);
    $('.css-download').show();
});

// 압축
function compress() {
    $('#log-view .message .flyout').remove();
    $('#log-view .message').removeAttr('data-messageid');
}

// 🔹 sleep 유틸
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔹 attachControls 비동기 버전 (배치 처리)
async function attachControlsAsync() {
    const messages = $('#log-view .message');
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        batch.each(function () {
            const $msg = $(this);
            if ($msg.find('.msg-controls').length === 0) {
                const controls = $(`
                    <div class="msg-controls">
                        <div class="move-handle"></div>
                        <button class="edit-btn">편집</button>
                        <button class="delete-btn">삭제</button>
                    </div>
                `);
                $msg.append(controls);
            }
        });
        updateLoadingProgress(66 + Math.floor((i / messages.length) * 20), `편집 기능 로딩 중... (${i}/${messages.length})`);
        await sleep(10); // 브라우저 숨 쉴 시간
    }
}

// 🔹 정렬 기능 초기화 비동기
async function initSortableAsync(selector) {
    // DOM 안정화 잠깐 대기
    await sleep(50);

    // 실제 sortable 초기화
    const container = $(selector);
    container.sortable({
        items: ".message",
        handle: ".move-handle",
        cursor: "move",
        placeholder: "message-placeholder",
        axis: "y",
        stop: saveState
    });
}

// 편집 시작
$('#show-html').on('click', async function () {
    if (!$('#log-text').val().includes('div class="message')) {
        alert('롤20 형식의 HTML이 아닙니다.');
        return;
    }
    if ($('#log-text').val().includes('class="no-edit"')) {
        alert('편집할 로그를 입력해 주세요.');
        return;
    }

    showLoadingOverlay();
    updateLoadingProgress(0, "HTML 불러오는 중...");
    await sleep(50); // UI 렌더링 여유

    $('#section-upload').hide();
    $('#log-view').empty();
    const htmlCode = $('#log-text').val();
    $('#log-view').html(htmlCode);

    updateLoadingProgress(33, "코드 압축 중...");
    await sleep(30);
    compress();
    saveState();

    updateLoadingProgress(66, "편집 기능 로딩 중...");
    await attachControlsAsync();

    updateLoadingProgress(90, "정렬 기능 로딩 중...");
    await initSortableAsync("#log-view");

    window.onbeforeunload = function () {
        return "변경 내용이 사라질 수 있습니다. 페이지를 나가시겠습니까?";
    };

    $('#section-edit').show();
    $('.tool-btn').show();
    updateLoadingProgress(100, "편집 준비 완료!");
    await sleep(300);

    $('.message a').each(function () { $(this).attr('target', '_blank'); });
    $('.message a[href^="!"], .message a[href^="~"]').click(function (event) { event.preventDefault(); });

    hideLoadingOverlay();
});

// 🔹 로딩 오버레이 생성
function showLoadingOverlay() {
    if ($('#loading-overlay').length === 0) {
        const overlay = $(`
            <div id="loading-overlay" style="
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(3px);
                color: white;
                font-family: sans-serif;
            ">
                <div style="text-align:center; width: 250px;">
                    <div id="loading-text" style="margin-bottom: 12px; font-size: 1.2em;">
                        로딩 중...
                    </div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 10px; height: 12px;">
                        <div id="loading-bar" style="
                            width: 0%;
                            height: 12px;
                            background: #4ade80;
                            border-radius: 10px;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                </div>
            </div>
        `);
        $('body').append(overlay);
    } else {
        $('#loading-overlay').show();
    }
}

// 🔹 진행률 업데이트
function updateLoadingProgress(percent, text) {
    $('#loading-bar').css('width', `${percent}%`);
    $('#loading-text').text(text);
}

// 🔹 오버레이 제거
function hideLoadingOverlay() {
    $('#loading-overlay').fadeOut(300, function () {
        $(this).remove();
    });
}

// 🔹 .message 컨트롤 추가
function attachControls() {
    $('#log-view .message').each(function () {
        const $msg = $(this);
        if ($msg.find('.msg-controls').length === 0) {
            const controls = $(`
            <div class="msg-controls">
            <div class="move-handle"></div>
            <button class="edit-btn">편집</button>
            <button class="delete-btn">삭제</button>
            </div>
            `);
            $msg.append(controls);
        }
    });
}

// 🔹 편집 (div 내부 textarea)
$(document).on('click', '.edit-btn', function () {
    const $msg = $(this).closest('.message');
    const $controls = $msg.find('.msg-controls');
    const currentHTML = $msg.clone().children('.msg-controls').remove().end().html().trim();

    if ($msg.find('textarea.inline-editor').length > 0) return;
    saveState();

    const textarea = $(`<textarea class="inline-editor">${currentHTML}</textarea>`);
    $msg.html(textarea).append($controls);

    textarea.focus();
    textarea.on('blur', function () {
        const newContent = textarea.val();
        $msg.html(newContent).append($controls);
        attachControls();
    });
});

// 🔹 삭제
$(document).on('click', '.delete-btn', function () {
    if (confirm('이 메시지를 삭제하시겠습니까?')) {
        saveState();
        $(this).closest('.message').remove();
    }
});

// 🔹 Undo/Redo 버튼
$('#undo-btn').on('click', undo);
$('#redo-btn').on('click', redo);

// 백업용 CSS 다운로드
$('.css-download').on('click', function () {
    const blob = new Blob([extractedCss], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-' + $('#css-view').text();
    a.click();
    URL.revokeObjectURL(url);
});

// 현재 코드 복사
$('#copy-html').on('click', function () {
    if ($('#include-css').is(':checked')) { htmlContent = styleTag + $('#log-view').clone().find('.msg-controls').remove().end().html(); }
    else { htmlContent = $('#log-view').clone().find('.msg-controls').remove().end().html(); }
    navigator.clipboard.writeText(htmlContent)
        .then(() => alert('HTML 내용이 복사되었습니다.'))
        .catch(() => alert('복사 실패'));
});

// HTML 파일로 저장
$('#download-html').on('click', function () {
    if ($('#include-css').is(':checked')) { htmlContent = styleTag + $('#log-view').clone().find('.msg-controls').remove().end().html(); }
    else { htmlContent = $('#log-view').clone().find('.msg-controls').remove().end().html(); }
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited.html';
    a.click();
    URL.revokeObjectURL(url);
});

$(document).ready(function () {
    attachControlsAsync();
    $("#log-view").sortable({
        items: ".message",
        handle: ".move-handle",
        cursor: "move",
        placeholder: "message-placeholder",
        axis: "y",
        stop: saveState
    });

    $('#what').click(function (event) {
        event.stopPropagation();
        $('.pop-up').addClass('active');
    });

    $(document).click(function () {
        $('.pop-up').removeClass('active');
    });

    $('#replaceBtn').click(function () {
        let find = $('#findText').val();
        let replace = $('#replaceText').val();

        if (find === "") {
            alert('찾을 내용이 없습니다.');
            return;
        }

        $('#log-view').each(function () {
            let html = $(this).html();
            let regex = new RegExp(find, 'g');
            $(this).html(html.replace(regex, replace));
        });
    });

    $('#eraser').click(function () {
        $('#log-text').empty();
        $('#sample').hide();
    })

    $('.message a').each(function () { $(this).attr('target', '_blank'); });
    $('.message a[href^="!"], .message a[href^="~"]').click(function (event) { event.preventDefault(); });
});