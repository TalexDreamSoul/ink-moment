<template>
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    :width="size" 
    :height="size" 
    viewBox="0 0 24 24"
    :style="{ color: color }"
  >
    <path 
      fill="currentColor" 
      d="m13.172 12l-4.95-4.95l1.414-1.413L16 12l-6.364 6.364l-1.414-1.415z"
    />
  </svg>
</template>

<script>
export default {
  name: 'IconArrow',
  props: {
    size: {
      type: [String, Number],
      default: '24'
    },
    color: {
      type: String,
      default: '#b2b2b2'
    }
  }
}
</script>
