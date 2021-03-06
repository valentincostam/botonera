// This set is used to contain the audio elements being played.
// Useful for stopping them all when hitting the Escape key.
const playingAudios = new Set()

const soundItems = Array.from(document.querySelectorAll(".sounds__item"))

const stopButton = document.querySelector(".stop-button")
const enableHotkeysCheckbox = document.querySelector(".enable-hotkeys-checkbox")

let areHotkeysEnabled = true
let soundItemBeingKeyBound = null
let soundsKeyBindings = null

const FORBIDDEN_KEYS = ["Enter", "Space", "Escape", "Tab", "ShiftLeft", "ShiftRight"]

function updateDocumentTitle() {
  if (playingAudios.size === 0) {
    document.title = "Botonera"
    return
  }

  const audioLabels = Array.from(playingAudios).map((audio) => {
    const soundButton = audio.parentElement.querySelector(".sounds__button")
    return soundButton.textContent
  })

  document.title = `Reproduciendo: ${audioLabels.join("; ")} · Botonera`
}

async function playSound(soundItem) {
  if (!soundItem) return

  const audio = soundItem.querySelector("audio")

  if (!audio) return

  try {
    // Play audio from the beginning, add it to playing audios set,
    // add a class to its li.sounds__item, and update document title.
    audio.currentTime = 0
    await audio.play()

    if (playingAudios.has(audio)) return

    playingAudios.add(audio)
    soundItem.classList.add("sounds__item--is-playing")
    stopButton.classList.remove("stop-button--is-hidden")
    updateDocumentTitle()

    // Whenever the audio pause, remove it from playing audios set,
    // remove a class from its li.sounds__item, and update document title.
    audio.addEventListener(
      "pause",
      () => {
        playingAudios.delete(audio)
        soundItem.classList.remove("sounds__item--is-playing")
        updateDocumentTitle()

        if (playingAudios.size === 0) {
          stopButton.classList.add("stop-button--is-hidden")
        }
      },
      { once: true }
    )
  } catch (error) {
    // TODO: Handle DOMException thrown when the user press a bound Control key before doing anything else.
    // DOMException: play() failed because the user didn't interact with the document first. https://goo.gl/xX8pDD
    console.error(error)
  }
}

function updateSoundKeyBinding({ soundItem, keyCode, keyText, isInitializing = false }) {
  const soundKey = soundItem.querySelector(".sounds__key")

  soundItem.dataset.keyCode = keyCode
  soundKey.textContent = keyText.toUpperCase()

  // If it's the first load, there is no need to update the soundsKeyBindings global object
  // as it already has "latest" key bindings (from Local Storage or the default ones).
  if (isInitializing) return

  soundsKeyBindings[soundItem.id].keyCode = keyCode
  soundsKeyBindings[soundItem.id].keyText = keyText.toUpperCase()

  localStorage.setItem("soundsKeyBindings", JSON.stringify(soundsKeyBindings))
}

function isKeyBound(keyCode) {
  return Object.values(soundsKeyBindings).some((soundKeyBinding) => soundKeyBinding.keyCode === keyCode)
}

function clearDuplicatedKeyBinding(keyCode) {
  if (!isKeyBound(keyCode)) return

  const duplicatedKeyBindingSoundItem = soundItems.find((soundItem) => soundItem.dataset.keyCode == keyCode)

  updateSoundKeyBinding({ soundItem: duplicatedKeyBindingSoundItem, keyCode: "", keyText: "?" })
}

function finishKeyBinding() {
  const soundKey = soundItemBeingKeyBound.querySelector(".sounds__key")
  soundKey.classList.remove("sounds__key--is-binding")
  soundItemBeingKeyBound = null
}

function cancelKeyBinding() {
  if (!soundItemBeingKeyBound) return

  finishKeyBinding()
}

function stopPlayingAudios() {
  playingAudios.forEach((audio) => {
    audio.pause()
    audio.currentTime = 0
  })
}

function handleKeyUp(event) {
  if (!areHotkeysEnabled) return

  const keyCode = event.code === "" ? event.key : event.code
  const keyText = event.key === " " ? keyCode : event.key

  // If some audio is playing and Escape key is pressed, pause them all.
  if (playingAudios.size > 0 && keyCode === "Escape") {
    stopPlayingAudios()
    return
  }

  // If a sound is being key-bound and a forbidden key is pressed, cancel key binding.
  if (soundItemBeingKeyBound && FORBIDDEN_KEYS.includes(keyCode)) {
    finishKeyBinding()
    return
  }

  if (soundItemBeingKeyBound) {
    clearDuplicatedKeyBinding(keyCode)
    updateSoundKeyBinding({ soundItem: soundItemBeingKeyBound, keyCode, keyText })
    finishKeyBinding()
    return
  }

  const soundItem = soundItems.find((soundItem) => soundItem.dataset.keyCode == keyCode)

  playSound(soundItem)
}

function handleClick(event) {
  const isSoundButton = event.target.classList.contains("sounds__button")
  const isSoundKey = event.target.classList.contains("sounds__key")
  const soundItem = this

  if (isSoundButton) {
    playSound(soundItem)
    return
  }

  if (isSoundKey && !soundItemBeingKeyBound) {
    event.stopPropagation()
    const soundKey = event.target
    soundKey.classList.add("sounds__key--is-binding")
    soundItemBeingKeyBound = soundItem
  }
}

function getDefaulKeyBindings() {
  const defaultKeyBindings = {}

  soundItems.forEach((soundItem) => {
    const soundKey = soundItem.querySelector(".sounds__key")
    defaultKeyBindings[soundItem.id] = {
      keyText: soundKey.textContent,
      keyCode: soundItem.dataset.keyCode ?? "",
    }
  })

  return defaultKeyBindings
}

function toggleHotkeys() {
  areHotkeysEnabled = !areHotkeysEnabled

  soundItems.forEach((soundItem) => {
    const soundKey = soundItem.querySelector(".sounds__key")
    soundKey.classList.toggle("sounds__key--is-hidden")
  })

  stopButton.classList.toggle("stop-button--without-hotkey")
}

function initialize() {
  soundsKeyBindings = JSON.parse(localStorage.getItem("soundsKeyBindings")) ?? getDefaulKeyBindings()

  soundItems.forEach((soundItem) => {
    const { keyCode, keyText } = soundsKeyBindings[soundItem.id]

    updateSoundKeyBinding({ soundItem, keyCode, keyText, isInitializing: true })

    soundItem.addEventListener("click", handleClick)
  })

  stopButton.addEventListener("click", stopPlayingAudios)
  enableHotkeysCheckbox.addEventListener("change", toggleHotkeys)

  window.addEventListener("keyup", handleKeyUp)
  window.addEventListener("click", cancelKeyBinding)
}

initialize()
