export function downloadFile(fileName: string, data: string) {
    const link = document.createElement('a');
    link.style.visibility = 'hidden';
    link.href = URL.createObjectURL(new Blob([data], { type: 'text/html' }));
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
