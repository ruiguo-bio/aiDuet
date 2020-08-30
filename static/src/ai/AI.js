/**
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Tone from 'Tone/core/Tone'
import MidiConvert from 'midiconvert'
import events from 'events'

class AI extends events.EventEmitter{
	constructor(){
		super()

		this._newTrack()

		this._sendTimeout = -1

		this._heldNotes = {}

		this._lastPhrase = -1

		this._aiEndTime = 0
	}

	_newTrack(){
		this._midi = new MidiConvert.create()
		this._track = this._midi.track()
	}

	send(){
		//trim the track to the first note
		if (this._track.length){
			let request = this._midi.slice(this._midi.startTime)
			this._newTrack()
			let endTime = request.duration
			//shorten the request if it's too long
			if (endTime > 8){
				request = request.slice(request.duration - 8)
				endTime = request.duration
			}
			// let additional = endTime
			// additional = Math.min(additional, 8)
			// additional = Math.max(additional, 1)
			console.log(endTime);
			console.log('starting the request');
			request.load(`./predict`, JSON.stringify(request.toArray()), 'POST').then((response) => {

				console.log('requist fulfilled');
				response.tracks[1].notes.forEach((note) => {
					const now = Tone.now() + 0.05
					if (note.noteOn + now > this._aiEndTime){
						this._aiEndTime = note.noteOn + now
						this.emit('keyDown', note.midi, note.noteOn + now)
						note.duration = note.duration * 0.9
						note.duration = Math.min(note.duration, 4)
						this.emit('keyUp', note.midi, note.noteOff + now)
					}
				})
			})
			this._lastPhrase = -1
			this.emit('sent')
		}
	}

	keyDown(note, time=Tone.now()){
		if (this._track.length === 0 && this._lastPhrase === -1){
			this._lastPhrase = Date.now()
		}
		this._track.noteOn(note, time)
		clearTimeout(this._sendTimeout)
		this._heldNotes[note] = true
	}

	keyUp(note, time=Tone.now()){
		this._track.noteOff(note, time)
		delete this._heldNotes[note]
		// send something if there are no events for a moment
		if (Object.keys(this._heldNotes).length === 0){
			if (this._lastPhrase !== -1 && Date.now() - this._lastPhrase > 10000){
				//just send it
				console.log(Date.now() - this._lastPhrase)
				this.send()
			} else {
				this._sendTimeout = setTimeout(this.send.bind(this), 600 + (time - Tone.now()) * 1000)
			}
		}
		this._lastPhrase = Date.now()
	}
}

export {AI}