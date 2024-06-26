<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const members = [
  {
    avatar: 'https://avatars.githubusercontent.com/u/30748928?v=4',
    name: 'Luweiqianyi',
    title: 'Creator',
    links: [
      { icon: 'github', link: 'https://github.com/luweiqianyi' },
    ]
  },
]
</script>

# 关于我

<VPTeamMembers size="small" :members="members" />
