export default class Scaler {
    private parent: HTMLElement;
    public update: CallableFunction;

    constructor(parentID: string, updating: CallableFunction) {
        this.parent = document.getElementById(parentID) as HTMLElement;
        this.update = updating;
    }

    /**
     * Add a new scaler.
     * @param name of scaler
     * @param init value of scaler
     * @param min value of scaler
     * @param max value of scaler
     * @param callback called when inputed value
     */
    add(name: string, init: number, min: number, max: number, callback: CallableFunction) {
        const container = document.createElement('div');
        const label = document.createElement('label');
        label.innerText = name;
        container.appendChild(label);
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = String(min);
        slider.max = String(max);
        slider.value = String(init);
        container.appendChild(slider);
        slider.addEventListener('input', () => {
            callback(Number.parseFloat(slider.value));
            this.update()
        });
        this.parent.appendChild(container);
    }
}