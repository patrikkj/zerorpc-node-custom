// Open Source Initiative OSI - The MIT License (MIT):Licensing
//
// The MIT License (MIT)
// Copyright (c) 2015 François-Xavier Bourlet (bombela+zerorpc@gmail.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.
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