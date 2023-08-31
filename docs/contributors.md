---
layout: page
---

<script setup>
import {
  VPTeamPage,
  VPTeamPageTitle,
  VPTeamMembers,
  VPTeamPageSection
} from 'vitepress/theme'

const maintainers = [
  {
    avatar: 'https://www.github.com/neodmy.png',
    name: 'David Yusta',
    title: 'Maintainer',
    organization: 'One Beyond',
    orgLink: 'https://github.com/onebeyond',
    links: [
      { icon: 'github', link: 'https://github.com/neodmy' },
    ]
  },
]

const contributors = [

]

</script>

<VPTeamPage>
  <VPTeamPageTitle>
    <template #title>Maintainers</template>
    <template #lead></template>
  </VPTeamPageTitle>
  <VPTeamMembers size="small" :members="maintainers"/>
  <VPTeamPageSection>
    <template #title>Contributors</template>
    <template #lead>Many thanks to all</template>
    <template #members>
      <VPTeamMembers size="small" :members="contributors" />
    </template>
  </VPTeamPageSection>
</VPTeamPage>
