<template>
    <button class="ui-button"><slot></slot></button>
</template>

<style scoped lang="css">
    .ui-button {
        border: 0.1em solid black;
        background: gray;
        border-radius: 0.25em;
        cursor: pointer;
        padding: 0.5em;
        
        &:hover {
            background: white;
        }
    
        &:active {
            background: yellow;
        }
    }
</style>
