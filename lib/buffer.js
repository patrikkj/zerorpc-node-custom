//Creates a new channel buffer
//capacity : number
//      The capacity of the buffer
class ChannelBuffer {
    constructor(capacity) {
        //Pre-allocate the buffer array to its capacity and set the length to 0.
        //This way, the length property is correct, but the array size equals
        //the maximum buffer size, so it doesn't have to be resized (as much).
        this._buffer = new Array(capacity);
        this._buffer.length = 0;
        this._capacity = capacity;
    }
    //Adds an item to the buffer
    add(item) {
        this._buffer.push(item);
    }
    //Removes an item from the buffer
    remove() {
        return this._buffer.shift();
    }
    //Gets the number of items in the buffer
    length() {
        return this._buffer.length;
    }
    //Gets the channel capacity
    getCapacity() {
        return this._capacity;
    }
    //Checks whether the buffer has capacity
    hasCapacity() {
        return this._capacity > 0;
    }
    //Updates the capacity
    setCapacity(capacity) {
        this._capacity = capacity;
    }
    //Decrements the capacity
    decrementCapacity() {
        this._capacity--;
    }
}

exports.ChannelBuffer = ChannelBuffer;