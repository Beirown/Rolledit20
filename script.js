let undoStack = [];
let redoStack = [];

// HTML 엔티티 변환
function encodeHTML(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function decodeHTML(str) { const t = document.createElement('textarea'); t.innerHTML = str; return t.value; }

// 🔹 상태 저장
function saveState() {
    undoStack.push($('#log-view').html());
    if (undoStack.length > 30) undoStack.shift();
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

// 🔹 HTML 파일 로드
$('#log-html').on('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        $('#log-text').val(e.target.result);
    };
    reader.readAsText(file, 'utf-8');
});

// 🔹 CSS 파일 여러 개 (누적 적용)
$('#log-css').on('change', function (event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) $('#css-tools').show();

    files.forEach(file => {
        if (!file.name.endsWith('.css')) return;

        // 파일명 목록 표시
        $('#css-list').append(`<li>${file.name}</li>`);

        const reader = new FileReader();
        reader.onload = function (e) {
            const cssText = e.target.result;
            const styleTag = $('<style data-uploaded="true"></style>').text(cssText);
            $('head').append(styleTag);
        };
        reader.readAsText(file, 'utf-8');
    });
});

// 🔹 CSS 초기화
$('#reset-css').on('click', function () {
    if (confirm('모든 업로드된 CSS를 제거하시겠습니까?')) {
        $('style[data-uploaded="true"]').remove();
        $('#css-list').empty(); // 목록 비우기
        $('#css-tools').hide();
    }
});

// 🔹 HTML 적용하기
$('#show-html').on('click', function () {
    const htmlCode = $('#log-text').val();
    $('#log-view').html(htmlCode);

    // 업로드 영역 전체 숨기기
    $('#upload-section').hide();
    $('#toolbar').show();
    $('#final-toolbar').show();

    compress();
    attachControls();
    saveState();

    // 🔹 여기가 드래그 순서 변경 적용 코드
    $(function () {
        $("#log-view").sortable({
            items: ".message",   // 드래그로 순서 변경 가능한 요소 지정
            handle: ".move-handle",
            cursor: "move",      // 마우스 커서 모양 변경
            placeholder: "message-placeholder", // 드래그 중 표시되는 자리
            axis: "y",            // 수직으로만 이동 가능
            stop: saveState // 드래그 후 순서 변경 기록
        });
    });

    // 페이지 이탈 경고
    window.onbeforeunload = function () {
        return "변경 내용이 사라질 수 있습니다. 페이지를 나가시겠습니까?";
    };
});

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

// 압축
function compress() {
    $('#log-view .message .flyout').remove();
    $('#log-view .message').removeAttr('data-messageid');
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

// 🔹 복사하기 버튼
$('#copy-html').on('click', function () {
    // .msg-controls 제거 후 HTML 추출
    const htmlContent = $('#log-view').clone().find('.msg-controls').remove().end().html();
    navigator.clipboard.writeText(htmlContent)
        .then(() => alert('HTML 내용이 복사되었습니다.'))
        .catch(() => alert('복사 실패!'));
});

// 🔹 HTML 다운로드 버튼
$('#download-html').on('click', function () {
    const htmlContent = $('#log-view').clone().find('.msg-controls').remove().end().html();
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited.html';
    a.click();
    URL.revokeObjectURL(url);
});