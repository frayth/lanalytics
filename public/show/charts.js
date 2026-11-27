customElements.define('expense-chart', class extends HTMLElement {
    draw(title, labels, datasets, horizontal = false) {
        const canvas = document.createElement('canvas');
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', title);
        this.replaceChildren(canvas);
        const currencyAxis = horizontal ? 'x' : 'y';
        this.chart = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                locale: 'fr-FR',
                indexAxis: horizontal ? 'y' : 'x',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: title },
                    tooltip: {
                        callbacks: {
                            label: item => `${item.dataset.label} : ${euro.format(item.parsed[currencyAxis])}`
                        }
                    }
                },
                scales: {
                    [currencyAxis]: {
                        beginAtZero: true,
                        ticks: { format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 } }
                    }
                }
            }
        });
    }

    disconnectedCallback() {
        this.chart?.destroy();
    }
});
